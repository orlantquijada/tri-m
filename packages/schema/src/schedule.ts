import { z } from "zod";

export const scheduleStatusEnum = z.enum([
  "pending",
  "partial",
  "paid",
  "overdue",
]);
export type ScheduleStatus = z.infer<typeof scheduleStatusEnum>;

export const scheduleSelectSchema = z.object({
  dueAmountCents: z.number(),
  dueDate: z.string(),
  id: z.number(),
  installmentNo: z.number(),
  paidAmountCents: z.number(),
  receivableId: z.number(),
  status: scheduleStatusEnum,
});

export type ScheduleSelect = z.infer<typeof scheduleSelectSchema>;
