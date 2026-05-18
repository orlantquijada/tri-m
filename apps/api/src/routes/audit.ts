import { zValidator } from "@hono/zod-validator";
import {
  auditEvents as auditEventsTable,
  db,
  distributors as distributorsTable,
  user as userTable,
} from "db";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { auditQuerySchema } from "schema";

import { createRouter } from "../lib/factory";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";

export const auditRoute = createRouter().get(
  "/",
  requireSession,
  zValidator("query", auditQuerySchema),
  async (c) => {
    Scope.forUser(c.get("user")).assertAdmin();
    const { actorId, entityId, entityType, from, limit, page, to } =
      c.req.valid("query");

    const conditions: SQL[] = [];
    if (entityType) {
      conditions.push(eq(auditEventsTable.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(auditEventsTable.entityId, entityId));
    }
    if (actorId) {
      conditions.push(eq(auditEventsTable.actorId, actorId));
    }
    if (from) {
      conditions.push(gte(auditEventsTable.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(auditEventsTable.createdAt, new Date(to)));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (page - 1) * limit;

    const events = await db
      .select({
        actorEmail: userTable.email,
        actorId: auditEventsTable.actorId,
        actorName: userTable.name,
        createdAt: auditEventsTable.createdAt,
        distributorId: auditEventsTable.distributorId,
        distributorName: distributorsTable.name,
        entityId: auditEventsTable.entityId,
        entityType: auditEventsTable.entityType,
        event: auditEventsTable.event,
        id: auditEventsTable.id,
        metadata: auditEventsTable.metadata,
      })
      .from(auditEventsTable)
      .leftJoin(userTable, eq(auditEventsTable.actorId, userTable.id))
      .leftJoin(
        distributorsTable,
        eq(auditEventsTable.distributorId, distributorsTable.id)
      )
      .where(whereClause)
      .orderBy(desc(auditEventsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [totals] = await db
      .select({ value: count() })
      .from(auditEventsTable)
      .where(whereClause);

    return c.json({
      events,
      limit,
      page,
      total: totals?.value ?? 0,
    });
  }
);
