import { z } from "zod";

export const auditEntityTypeEnum = z.enum([
  "payment",
  "customer",
  "blacklist_request",
  "user",
]);

export const auditEventTypeEnum = z.enum([
  "payment.recorded",
  "payment.voided",
  "customer.status_changed",
  "blacklist.requested",
  "blacklist.approved",
  "blacklist.rejected",
  "user.password_reset",
  "user.distributor_assigned",
]);

export const auditEventSelectSchema = z.object({
  actorId: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  distributorId: z.number().nullable(),
  entityId: z.string(),
  entityType: auditEntityTypeEnum,
  event: auditEventTypeEnum,
  id: z.number(),
  metadata: z.string().nullable(),
});

export const auditEventListItemSchema = auditEventSelectSchema.extend({
  actorEmail: z.string().nullable(),
  actorName: z.string().nullable(),
  distributorName: z.string().nullable(),
});

export const auditQuerySchema = z.object({
  actorId: z.string().optional(),
  entityId: z.string().optional(),
  entityType: auditEntityTypeEnum.optional(),
  from: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page: z.coerce.number().int().min(1).default(1),
  to: z.string().optional(),
});

export type AuditEntityType = z.infer<typeof auditEntityTypeEnum>;
export type AuditEventType = z.infer<typeof auditEventTypeEnum>;
export type AuditEventSelect = z.infer<typeof auditEventSelectSchema>;
export type AuditEventListItem = z.infer<typeof auditEventListItemSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
