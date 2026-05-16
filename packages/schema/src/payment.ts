import { z } from "zod";

import { paymentMethodEnum } from "./enums";

export const paymentSelectSchema = z.object({
  amountCents: z.number(),
  customerId: z.number(),
  id: z.number(),
  notes: z.string().nullable(),
  paymentDate: z.string(),
  paymentMethod: paymentMethodEnum,
  receivableId: z.number(),
  recordedBy: z.string().nullable(),
  referenceNumber: z.string().nullable(),
});

export const paymentInsertSchema = z.object({
  amountCents: z.number().int().positive("Amount must be greater than 0"),
  notes: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: paymentMethodEnum,
  receivableId: z.number().int().positive(),
  referenceNumber: z.string().optional(),
});

export type PaymentSelect = z.infer<typeof paymentSelectSchema>;
export type PaymentInsert = z.infer<typeof paymentInsertSchema>;
