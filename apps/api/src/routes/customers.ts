import { customers as customersTable, db, receivables } from "db";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";

import { requireSession } from "../middleware/auth";
import type { AuthVariables } from "../middleware/auth";

export const customers = new Hono<{ Variables: AuthVariables }>().get(
  "/",
  requireSession,
  async (c) => {
    const user = c.get("user");

    const scopeFilter =
      user.role === "distributor" && user.distributorId != null
        ? eq(customersTable.distributorId, user.distributorId)
        : undefined;

    const rows = await db
      .select({
        address: customersTable.address,
        distributorId: customersTable.distributorId,
        fullName: customersTable.fullName,
        id: customersTable.id,
        latitude: customersTable.latitude,
        longitude: customersTable.longitude,
        notes: customersTable.notes,
        outstandingBalanceCents: sql<number>`coalesce(sum(${receivables.currentBalanceCents}), 0)`,
        phone: customersTable.phone,
        riskStatus: customersTable.riskStatus,
      })
      .from(customersTable)
      .leftJoin(receivables, eq(receivables.customerId, customersTable.id))
      .where(scopeFilter)
      .groupBy(customersTable.id);

    return c.json(rows);
  }
);
