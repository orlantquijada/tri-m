import type { db } from "db";
import { auditEvents as auditEventsTable } from "db";
import type { AuditEntityType, AuditEventType } from "schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = Tx | typeof db;

export type LogEventInput = {
  actorId: string;
  distributorId?: number | null;
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
