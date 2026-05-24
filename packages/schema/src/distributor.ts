import { z } from "zod";

import { distributorStatusEnum } from "./enums";

export const distributorSelectSchema = z.object({
  assignedArea: z.string().nullable(),
  createdAt: z.date(),
  id: z.cuid2(),
  name: z.string(),
  phone: z.string(),
  status: distributorStatusEnum,
  updatedAt: z.date(),
});

export const distributorListItemSchema = distributorSelectSchema.extend({
  customerCount: z.number(),
  outstandingCents: z.number(),
});

export const distributorInsertSchema = z.object({
  assignedArea: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  status: distributorStatusEnum.default("active"),
});

export const distributorUpdateSchema = distributorInsertSchema.partial();

export type DistributorSelect = z.infer<typeof distributorSelectSchema>;
export type DistributorListItem = z.infer<typeof distributorListItemSchema>;
export type DistributorInsert = z.infer<typeof distributorInsertSchema>;
export type DistributorUpdate = z.infer<typeof distributorUpdateSchema>;
