import { z } from "zod";

import { paymentMethodEnum } from "./enums";

export const paymentSelectSchema = z.object({
  amountCents: z.number(),
  customerId: z.cuid2(),
  id: z.cuid2(),
  notes: z.string().nullable(),
  paymentDate: z.string(),
  paymentMethod: paymentMethodEnum,
  receivableId: z.cuid2(),
  recordedBy: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  voidReason: z.string().nullable(),
  voidedAt: z.string().nullable(),
});

export const paymentInsertSchema = z.object({
  amountCents: z.number().int().positive("Amount must be greater than 0"),
  notes: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: paymentMethodEnum,
  receivableId: z.cuid2(),
  referenceNumber: z.string().optional(),
});

export const voidPaymentSchema = z.object({
  reason: z.string().min(1),
});

export type PaymentSelect = z.infer<typeof paymentSelectSchema>;
export type PaymentInsert = z.infer<typeof paymentInsertSchema>;
export type VoidPayment = z.infer<typeof voidPaymentSchema>;
