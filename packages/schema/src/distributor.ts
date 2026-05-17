import { z } from "zod";

export const distributorSelectSchema = z.object({
  assignedArea: z.string().nullable(),
  createdAt: z.date(),
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  status: z.enum(["active", "inactive"]),
  updatedAt: z.date(),
});

export const distributorListItemSchema = distributorSelectSchema.extend({
  customerCount: z.number(),
  outstandingCents: z.number(),
});

export type DistributorSelect = z.infer<typeof distributorSelectSchema>;
export type DistributorListItem = z.infer<typeof distributorListItemSchema>;
