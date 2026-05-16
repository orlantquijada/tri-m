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

export type CustomerSelect = z.infer<typeof customerSelectSchema>;
export type CustomerListItem = z.infer<typeof customerListItemSchema>;
