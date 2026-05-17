import { z } from "zod";

import { receivableStatusEnum } from "./enums";

export const receivableSelectSchema = z.object({
  currentBalanceCents: z.number(),
  customerId: z.number(),
  distributorId: z.number(),
  downPaymentCents: z.number(),
  firstDueDate: z.string(),
  id: z.number(),
  monthlyDueAmountCents: z.number().nullable(),
  originalBalanceCents: z.number(),
  paymentTermMonths: z.number().nullable(),
  productDescription: z.string(),
  saleDate: z.string(),
  status: receivableStatusEnum,
  totalAmountCents: z.number(),
});

export const receivableSummarySchema = receivableSelectSchema.pick({
  currentBalanceCents: true,
  firstDueDate: true,
  id: true,
  originalBalanceCents: true,
  productDescription: true,
  saleDate: true,
  status: true,
});

export const receivableInsertSchema = z
  .object({
    adminOverride: z.boolean().optional(),
    customerId: z.number().int().positive("Customer is required"),
    downPaymentCents: z.number().int().min(0).default(0),
    firstDueDate: z.string().min(1, "First due date is required"),
    monthlyDueAmountCents: z.number().int().min(0).optional(),
    paymentTermMonths: z.number().int().positive().optional(),
    productDescription: z.string().min(1, "Product description is required"),
    saleDate: z.string().min(1, "Sale date is required"),
    totalAmountCents: z.number().int().min(0, "Total must be non-negative"),
  })
  .refine((data) => data.downPaymentCents <= data.totalAmountCents, {
    message: "Down payment cannot exceed total amount",
    path: ["downPaymentCents"],
  });

export type ReceivableSelect = z.infer<typeof receivableSelectSchema>;
export type ReceivableSummary = z.infer<typeof receivableSummarySchema>;
export type ReceivableInsert = z.infer<typeof receivableInsertSchema>;
