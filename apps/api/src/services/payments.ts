import {
  db,
  paymentSchedules as paymentSchedulesTable,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { paymentSelectSchema } from "schema";
import type { PaymentInsert, VoidPayment } from "schema";

import { badRequest, notFound } from "../lib/http";
import { applyPayment } from "../lib/receivable";
import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";

export function createPayment(user: User, data: PaymentInsert) {
  return db.transaction(async (tx) => {
    const [receivable] = await tx
      .select({
        currentBalanceCents: receivablesTable.currentBalanceCents,
        customerId: receivablesTable.customerId,
        distributorId: receivablesTable.distributorId,
        id: receivablesTable.id,
        status: receivablesTable.status,
      })
      .from(receivablesTable)
      .where(eq(receivablesTable.id, data.receivableId));

    if (!receivable) {
      throw notFound("Receivable not found");
    }
    Scope.forUser(user).assertCanWrite(receivable.distributorId);
    if (receivable.status === "fully_paid") {
      throw badRequest("Receivable is already fully paid");
    }
    if (data.amountCents > receivable.currentBalanceCents) {
      throw badRequest(
        `Amount exceeds current balance of ${receivable.currentBalanceCents} cents`
      );
    }

    const [payment] = await tx
      .insert(paymentsTable)
      .values({
        amountCents: data.amountCents,
        customerId: receivable.customerId,
        notes: data.notes ?? null,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        receivableId: data.receivableId,
        recordedBy: user.id,
        referenceNumber: data.referenceNumber ?? null,
      })
      .returning();

    const { newBalanceCents, newStatus } = applyPayment(
      receivable,
      data.amountCents
    );

    // Allocate payment to oldest unpaid schedule installments
    const unpaidRows = await tx
      .select()
      .from(paymentSchedulesTable)
      .where(
        and(
          eq(paymentSchedulesTable.receivableId, data.receivableId),
          inArray(paymentSchedulesTable.status, ["pending", "partial"])
        )
      )
      .orderBy(asc(paymentSchedulesTable.installmentNo));

    if (unpaidRows.length > 0) {
      type ScheduleUpdate = {
        id: number;
        paidAmountCents: number;
        status: "paid" | "partial";
      };
      const updates: ScheduleUpdate[] = [];
      let remaining = data.amountCents;
      for (const row of unpaidRows) {
        if (remaining <= 0) {
          break;
        }
        const outstanding = row.dueAmountCents - row.paidAmountCents;
        if (remaining >= outstanding) {
          updates.push({
            id: row.id,
            paidAmountCents: row.dueAmountCents,
            status: "paid",
          });
          remaining -= outstanding;
        } else {
          updates.push({
            id: row.id,
            paidAmountCents: row.paidAmountCents + remaining,
            status: "partial",
          });
          remaining = 0;
        }
      }
      await Promise.all(
        updates.map(({ id, paidAmountCents, status }) =>
          tx
            .update(paymentSchedulesTable)
            .set({ paidAmountCents, status })
            .where(eq(paymentSchedulesTable.id, id))
        )
      );
    }

    await tx
      .update(receivablesTable)
      .set({ currentBalanceCents: newBalanceCents, status: newStatus })
      .where(eq(receivablesTable.id, data.receivableId));

    return paymentSelectSchema.parse(payment);
  });
}

export function voidPayment(user: User, paymentId: number, data: VoidPayment) {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId));

    if (!payment) {
      throw notFound("Payment not found");
    }
    if (payment.voidedAt) {
      throw badRequest("Payment is already voided");
    }

    const [receivable] = await tx
      .select()
      .from(receivablesTable)
      .where(eq(receivablesTable.id, payment.receivableId));

    if (!receivable) {
      throw notFound("Receivable not found");
    }
    Scope.forUser(user).assertAdmin();

    await tx
      .update(paymentsTable)
      .set({ voidReason: data.reason, voidedAt: new Date().toISOString() })
      .where(eq(paymentsTable.id, paymentId));

    const scheduleRows = await tx
      .select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.receivableId, receivable.id))
      .orderBy(asc(paymentSchedulesTable.installmentNo));

    if (scheduleRows.length > 0) {
      await tx
        .update(paymentSchedulesTable)
        .set({ paidAmountCents: 0, status: "pending" })
        .where(eq(paymentSchedulesTable.receivableId, receivable.id));
    }

    const nonVoidedPayments = await tx
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.receivableId, receivable.id),
          isNull(paymentsTable.voidedAt)
        )
      )
      .orderBy(asc(paymentsTable.createdAt));

    type RowState = {
      id: number;
      dueAmountCents: number;
      paidAmountCents: number;
      status: "pending" | "partial" | "paid" | "overdue";
    };

    const states: RowState[] = scheduleRows.map((r) => ({
      dueAmountCents: r.dueAmountCents,
      id: r.id,
      paidAmountCents: 0,
      status: "pending" as const,
    }));

    for (const p of nonVoidedPayments) {
      let remaining = p.amountCents;
      for (const row of states) {
        if (remaining <= 0) {
          break;
        }
        if (row.status === "paid") {
          continue;
        }
        const outstanding = row.dueAmountCents - row.paidAmountCents;
        if (remaining >= outstanding) {
          row.paidAmountCents = row.dueAmountCents;
          row.status = "paid";
          remaining -= outstanding;
        } else {
          row.paidAmountCents += remaining;
          row.status = "partial";
          remaining = 0;
        }
      }
    }

    if (states.length > 0) {
      await Promise.all(
        states.map((s) =>
          tx
            .update(paymentSchedulesTable)
            .set({ paidAmountCents: s.paidAmountCents, status: s.status })
            .where(eq(paymentSchedulesTable.id, s.id))
        )
      );
    }

    const totalNonVoided = nonVoidedPayments.reduce(
      (sum, p) => sum + p.amountCents,
      0
    );
    const newBalanceCents = receivable.originalBalanceCents - totalNonVoided;
    const today = new Date().toISOString().split("T")[0]!;
    const newStatus =
      newBalanceCents === 0
        ? "fully_paid"
        : (receivable.firstDueDate < today
          ? "overdue"
          : "current");

    await tx
      .update(receivablesTable)
      .set({ currentBalanceCents: newBalanceCents, status: newStatus })
      .where(eq(receivablesTable.id, receivable.id));

    return { newBalanceCents, paymentId };
  });
}
