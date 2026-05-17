import { z } from "zod";

import { customerSummarySchema } from "./customer";
import { receivableStatusEnum } from "./enums";
import { paymentSelectSchema } from "./payment";
import { receivableSelectSchema } from "./receivable";

export const receivableDetailSchema = receivableSelectSchema.extend({
  customer: customerSummarySchema,
  payments: z.array(paymentSelectSchema),
});

export const overdueRowSchema = z.object({
  address: z.string(),
  currentBalanceCents: z.number(),
  customerId: z.number(),
  customerName: z.string(),
  daysOverdue: z.number(),
  distributorName: z.string(),
  firstDueDate: z.string(),
  id: z.number(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  phone: z.string(),
  productDescription: z.string(),
  status: receivableStatusEnum,
  totalAmountCents: z.number(),
});

export type ReceivableDetail = z.infer<typeof receivableDetailSchema>;
export type OverdueRow = z.infer<typeof overdueRowSchema>;
