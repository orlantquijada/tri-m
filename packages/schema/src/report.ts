import { z } from "zod";

export const distributorPerformanceRowSchema = z.object({
  collectedCents: z.number().int(),
  collectionRatePct: z.number(),
  customerCount: z.number().int(),
  distributorId: z.number().int(),
  distributorName: z.string(),
  originalBalanceCents: z.number().int(),
  outstandingCents: z.number().int(),
  overdueCents: z.number().int(),
});

export type DistributorPerformanceRow = z.infer<
  typeof distributorPerformanceRowSchema
>;
