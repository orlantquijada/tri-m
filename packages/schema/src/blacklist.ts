import { z } from "zod";

const blacklistStatusEnum = z.enum(["pending", "approved", "rejected"]);

export const blacklistRequestInsertSchema = z.object({
  customerId: z.number().int().positive(),
  reason: z.string().min(1, "Reason is required"),
});

export const blacklistReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().optional(),
});

export const blacklistRequestSelectSchema = z.object({
  createdAt: z.union([z.string(), z.date()]),
  customerId: z.number(),
  distributorId: z.number(),
  id: z.number(),
  reason: z.string(),
  requestedByUserId: z.string(),
  reviewNote: z.string().nullable(),
  reviewedAt: z.union([z.string(), z.date()]).nullable(),
  reviewedByUserId: z.string().nullable(),
  status: blacklistStatusEnum,
});

export const blacklistRequestListItemSchema =
  blacklistRequestSelectSchema.extend({
    customerFullName: z.string(),
    distributorName: z.string(),
  });

export type BlacklistRequestInsert = z.infer<
  typeof blacklistRequestInsertSchema
>;
export type BlacklistReview = z.infer<typeof blacklistReviewSchema>;
export type BlacklistRequestSelect = z.infer<
  typeof blacklistRequestSelectSchema
>;
export type BlacklistRequestListItem = z.infer<
  typeof blacklistRequestListItemSchema
>;
