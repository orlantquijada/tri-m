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
  id: z.cuid2(),
  installmentNo: z.number(),
  paidAmountCents: z.number(),
  receivableId: z.cuid2(),
  status: scheduleStatusEnum,
});

export type ScheduleSelect = z.infer<typeof scheduleSelectSchema>;
