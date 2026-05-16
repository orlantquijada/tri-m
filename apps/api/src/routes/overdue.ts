import {
  customers as customersTable,
  db,
  distributors as distributorsTable,
  receivables as receivablesTable,
} from "db";
import { and, eq, gt, sql } from "drizzle-orm";
import { Hono } from "hono";

import type { AuthVariables } from "../middleware/auth";
import { requireSession } from "../middleware/auth";

export const overdue = new Hono<{ Variables: AuthVariables }>().get(
  "/",
  requireSession,
  async (c) => {
    const user = c.get("user");

    const scopeFilter =
      user.role === "distributor" && typeof user.distributorId === "number"
        ? eq(receivablesTable.distributorId, user.distributorId)
        : undefined;

    const rows = await db
      .select({
        address: customersTable.address,
        currentBalanceCents: receivablesTable.currentBalanceCents,
        customerId: customersTable.id,
        customerName: customersTable.fullName,
        daysOverdue: sql<number>`cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer)`,
        distributorName: distributorsTable.name,
        firstDueDate: receivablesTable.firstDueDate,
        id: receivablesTable.id,
        latitude: customersTable.latitude,
        longitude: customersTable.longitude,
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
          scopeFilter
        )
      )
      .orderBy(sql`julianday(${receivablesTable.firstDueDate})`);

    return c.json(rows);
  }
);
