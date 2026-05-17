import {
  db,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import { eq } from "drizzle-orm";
import { paymentSelectSchema } from "schema";
import type { PaymentInsert } from "schema";

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

    await tx
      .update(receivablesTable)
      .set({ currentBalanceCents: newBalanceCents, status: newStatus })
      .where(eq(receivablesTable.id, data.receivableId));

    return paymentSelectSchema.parse(payment);
  });
}
