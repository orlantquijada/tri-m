import { z } from "zod";

export const receivableInsertSchema = z
  .object({
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

export type ReceivableInsert = z.infer<typeof receivableInsertSchema>;
