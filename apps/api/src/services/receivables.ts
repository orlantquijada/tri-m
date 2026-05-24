import {
  customers as customersTable,
  db,
  paymentSchedules as paymentSchedulesTable,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import { asc, desc, eq } from "drizzle-orm";
import { receivableDetailSchema, receivableSelectSchema } from "schema";
import type { ReceivableInsert } from "schema";

import { forbidden, notFound } from "../lib/http";
import { computeOriginalBalance } from "../lib/receivable";
import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function getReceivable(user: User, id: string) {
  const [[receivable], payments, schedule] = await Promise.all([
    db.select().from(receivablesTable).where(eq(receivablesTable.id, id)),
    db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.receivableId, id))
      .orderBy(desc(paymentsTable.paymentDate)),
    db
      .select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.receivableId, id))
      .orderBy(asc(paymentSchedulesTable.installmentNo)),
  ]);

  if (!receivable) {
    throw notFound("Receivable not found");
  }
  Scope.forUser(user).assertCanRead(receivable.distributorId);

  const [customer] = await db
    .select({
      address: customersTable.address,
      fullName: customersTable.fullName,
      id: customersTable.id,
      phone: customersTable.phone,
      riskStatus: customersTable.riskStatus,
    })
    .from(customersTable)
    .where(eq(customersTable.id, receivable.customerId));

  if (!customer) {
    throw notFound("Customer not found");
  }

  return receivableDetailSchema.parse({
    ...receivable,
    customer,
    payments,
    schedule,
  });
}

export function createReceivable(user: User, data: ReceivableInsert) {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, data.customerId));

    if (!customer) {
      throw notFound("Customer not found");
    }
    Scope.forUser(user).assertCanWrite(customer.distributorId);
    if (customer.riskStatus === "blacklisted" && user.role === "distributor") {
      throw forbidden("Cannot create receivable for blacklisted customer");
    }

    const originalBalanceCents = computeOriginalBalance(data);

    const [receivable] = await tx
      .insert(receivablesTable)
      .values({
        currentBalanceCents: originalBalanceCents,
        customerId: data.customerId,
        distributorId: customer.distributorId,
        downPaymentCents: data.downPaymentCents,
        firstDueDate: data.firstDueDate,
        monthlyDueAmountCents: data.monthlyDueAmountCents ?? null,
        originalBalanceCents,
        paymentTermMonths: data.paymentTermMonths ?? null,
        productDescription: data.productDescription,
        saleDate: data.saleDate,
        status: "current",
        totalAmountCents: data.totalAmountCents,
      })
      .returning();

    if (data.paymentTermMonths && data.paymentTermMonths > 0) {
      const N = data.paymentTermMonths;
      const base = Math.floor(originalBalanceCents / N);
      const remainder = originalBalanceCents - base * N;
      await tx.insert(paymentSchedulesTable).values(
        Array.from({ length: N }, (_, i) => ({
          dueAmountCents: i === N - 1 ? base + remainder : base,
          dueDate: addMonths(data.firstDueDate, i),
          installmentNo: i + 1,
          paidAmountCents: 0,
          receivableId: receivable.id,
          status: "pending" as const,
        }))
      );
    }

    return receivableSelectSchema.parse(receivable);
  });
}
