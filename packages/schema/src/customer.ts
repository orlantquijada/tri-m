import { z } from "zod";

import { riskStatusEnum } from "./enums";

export const customerSelectSchema = z.object({
  address: z.string(),
  createdAt: z.number().nullable(),
  distributorId: z.number(),
  fullName: z.string(),
  id: z.number(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  notes: z.string().nullable(),
  phone: z.string(),
  riskStatus: riskStatusEnum,
  updatedAt: z.number().nullable(),
});

export const customerListItemSchema = customerSelectSchema.extend({
  outstandingBalanceCents: z.number(),
});

export const customerInsertSchema = z.object({
  address: z.string().min(1, "Address is required"),
  distributorId: z.number().int().positive().optional(),
  fullName: z.string().min(1, "Name is required"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  notes: z.string().nullable().optional(),
  phone: z.string().min(1, "Phone is required"),
  riskStatus: riskStatusEnum.default("good"),
});

export const customerUpdateSchema = customerInsertSchema
  .omit({ distributorId: true })
  .partial();

export type CustomerSelect = z.infer<typeof customerSelectSchema>;
export type CustomerListItem = z.infer<typeof customerListItemSchema>;
export type CustomerInsert = z.infer<typeof customerInsertSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
