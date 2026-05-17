import {
  customers as customersTable,
  db,
  distributors as distributorsTable,
  paymentSchedules as paymentSchedulesTable,
  receivables as receivablesTable,
} from "db";
import { and, count, eq, gt, inArray, notExists, sql } from "drizzle-orm";
import { overdueRowSchema } from "schema";

import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";

const daysOverdueSql = sql<number>`cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer)`;

export async function listOverdue(user: User) {
  const scope = Scope.forUser(user);

  const [withSchedule, withoutSchedule] = await Promise.all([
    // Receivables with at least one overdue unpaid schedule installment
    db
      .select({
        address: customersTable.address,
        currentBalanceCents: receivablesTable.currentBalanceCents,
        customerId: customersTable.id,
        customerName: customersTable.fullName,
        daysOverdue: daysOverdueSql,
        distributorName: distributorsTable.name,
        firstDueDate: receivablesTable.firstDueDate,
        id: receivablesTable.id,
        latitude: customersTable.latitude,
        longitude: customersTable.longitude,
        oldestUnpaidDueDate: sql<string>`coalesce(min(${paymentSchedulesTable.dueDate}), ${receivablesTable.firstDueDate})`,
        pastDueInstallmentCount: count(paymentSchedulesTable.id),
        phone: customersTable.phone,
        productDescription: receivablesTable.productDescription,
        status: receivablesTable.status,
        totalAmountCents: receivablesTable.totalAmountCents,
      })
      .from(receivablesTable)
      .innerJoin(
        paymentSchedulesTable,
        and(
          eq(paymentSchedulesTable.receivableId, receivablesTable.id),
          inArray(paymentSchedulesTable.status, ["pending", "partial"]),
          sql`date(${paymentSchedulesTable.dueDate}) < date('now')`
        )
      )
      .innerJoin(
        customersTable,
        eq(receivablesTable.customerId, customersTable.id)
      )
      .innerJoin(
        distributorsTable,
        eq(receivablesTable.distributorId, distributorsTable.id)
      )
      .where(
        and(
          gt(receivablesTable.currentBalanceCents, 0),
          scope.filterQuery(receivablesTable.distributorId)
        )
      )
      .groupBy(receivablesTable.id, customersTable.id, distributorsTable.id),

    // Legacy receivables with no schedule rows (back-compat)
    db
      .select({
        address: customersTable.address,
        currentBalanceCents: receivablesTable.currentBalanceCents,
        customerId: customersTable.id,
        customerName: customersTable.fullName,
        daysOverdue: daysOverdueSql,
        distributorName: distributorsTable.name,
        firstDueDate: receivablesTable.firstDueDate,
        id: receivablesTable.id,
        latitude: customersTable.latitude,
        longitude: customersTable.longitude,
        oldestUnpaidDueDate: receivablesTable.firstDueDate,
        pastDueInstallmentCount: sql<number>`0`,
        phone: customersTable.phone,
        productDescription: receivablesTable.productDescription,
        status: receivablesTable.status,
        totalAmountCents: receivablesTable.totalAmountCents,
      })
      .from(receivablesTable)
      .innerJoin(
        customersTable,
        eq(receivablesTable.customerId, customersTable.id)
      )
      .innerJoin(
        distributorsTable,
        eq(receivablesTable.distributorId, distributorsTable.id)
      )
      .where(
        and(
          gt(receivablesTable.currentBalanceCents, 0),
          sql`date(${receivablesTable.firstDueDate}) < date('now')`,
          notExists(
            db
              .select({ id: paymentSchedulesTable.id })
              .from(paymentSchedulesTable)
              .where(
                eq(paymentSchedulesTable.receivableId, receivablesTable.id)
              )
          ),
          scope.filterQuery(receivablesTable.distributorId)
        )
      ),
  ]);

  const combined = [...withSchedule, ...withoutSchedule];
  combined.sort((a, b) =>
    a.oldestUnpaidDueDate.localeCompare(b.oldestUnpaidDueDate)
  );

  return overdueRowSchema.array().parse(combined);
}
