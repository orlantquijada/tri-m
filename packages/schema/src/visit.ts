import { z } from "zod";

export const visitTypeEnum = z.enum(["in_person", "phone", "sms", "other"]);
export type VisitType = z.infer<typeof visitTypeEnum>;

export const visitOutcomeEnum = z.enum([
  "paid",
  "promised",
  "no_answer",
  "refused",
  "wrong_contact",
  "other",
]);
export type VisitOutcome = z.infer<typeof visitOutcomeEnum>;

export const visitSelectSchema = z.object({
  createdAt: z.coerce.date(),
  customerId: z.number(),
  distributorId: z.number(),
  gpsLat: z.number().nullable(),
  gpsLng: z.number().nullable(),
  id: z.number(),
  notes: z.string().nullable(),
  outcome: visitOutcomeEnum,
  promiseResolvedAt: z.coerce.date().nullable(),
  promisedAmountCents: z.number().nullable(),
  promisedDate: z.string().nullable(),
  recordedByUserId: z.string(),
  type: visitTypeEnum,
});

const promiseDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Promised date must be YYYY-MM-DD");

export const visitInsertSchema = z
  .object({
    customerId: z.number().int().positive(),
    gpsLat: z.number().min(-90).max(90).nullable().optional(),
    gpsLng: z.number().min(-180).max(180).nullable().optional(),
    notes: z.string().nullable().optional(),
    outcome: visitOutcomeEnum,
    promisedAmountCents: z.number().int().positive().nullable().optional(),
    promisedDate: promiseDateSchema.nullable().optional(),
    type: visitTypeEnum,
  })
  .refine(
    (data) =>
      data.outcome === "promised"
        ? data.promisedAmountCents != null && data.promisedDate != null
        : data.promisedAmountCents == null && data.promisedDate == null,
    {
      message:
        "Promised visits require promisedAmountCents + promisedDate; other outcomes must leave them null",
      path: ["promisedAmountCents"],
    }
  );

export const visitListQuerySchema = z.object({
  customerId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page: z.coerce.number().int().min(1).default(1),
});

export type VisitSelect = z.infer<typeof visitSelectSchema>;
export type VisitInsert = z.infer<typeof visitInsertSchema>;
export type VisitListQuery = z.infer<typeof visitListQuerySchema>;
