import {
  customers as customersTable,
  db,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import { desc, eq } from "drizzle-orm";
import { receivableDetailSchema, receivableSelectSchema } from "schema";
import type { ReceivableInsert } from "schema";

import { isDistributorOwner } from "../lib/guards";
import { forbidden, notFound } from "../lib/http";
import type { User } from "../middleware/auth";

export async function getReceivable(user: User, id: number) {
  const [[receivable], payments] = await Promise.all([
    db.select().from(receivablesTable).where(eq(receivablesTable.id, id)),
    db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.receivableId, id))
      .orderBy(desc(paymentsTable.paymentDate)),
  ]);

  if (!receivable) {
    throw notFound("Receivable not found");
  }
  if (!isDistributorOwner(user, receivable.distributorId)) {
    throw forbidden();
  }

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

  return receivableDetailSchema.parse({ ...receivable, customer, payments });
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
    if (!isDistributorOwner(user, customer.distributorId)) {
      throw forbidden();
    }
    if (customer.riskStatus === "blacklisted" && user.role === "distributor") {
      throw forbidden("Cannot create receivable for blacklisted customer");
    }

    const originalBalanceCents = data.totalAmountCents - data.downPaymentCents;

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

    return receivableSelectSchema.parse(receivable);
  });
}
