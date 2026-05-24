import {
  auditEvents as auditEventsTable,
  db,
  distributors as distributorsTable,
  user as userTable,
} from "db";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AuditEntityType, AuditEventType, AuditQuery } from "schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = Tx | typeof db;

export type LogEventInput = {
  actorId: string;
  distributorId?: string | null;
  entityId: string;
  entityType: AuditEntityType;
  event: AuditEventType;
  metadata?: Record<string, unknown>;
};

export function logEvent(client: DbOrTx, input: LogEventInput) {
  return client.insert(auditEventsTable).values({
    actorId: input.actorId,
    distributorId: input.distributorId ?? null,
    entityId: input.entityId,
    entityType: input.entityType,
    event: input.event,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

export async function listAuditEvents(query: AuditQuery) {
  const { actorId, entityId, entityType, from, limit, page, to } = query;

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

  const [events, totals] = await Promise.all([
    db
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
      .offset(offset),
    db
      .select({ value: count() })
      .from(auditEventsTable)
      .where(whereClause)
      .then((rows) => rows[0]),
  ]);

  return {
    events,
    limit,
    page,
    total: totals?.value ?? 0,
  };
}
