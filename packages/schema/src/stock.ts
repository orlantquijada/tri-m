import { z } from "zod";

import { stockMovementTypeEnum } from "./enums";

export const stockMovementSelectSchema = z.object({
  createdAt: z.union([z.string(), z.date()]),
  distributorId: z.cuid2(),
  id: z.cuid2(),
  productId: z.cuid2(),
  qty: z.number().int(),
  reasonNote: z.string().nullable(),
  recordedByUserId: z.string(),
  referenceId: z.string().nullable(),
  referenceType: z.string().nullable(),
  type: stockMovementTypeEnum,
  voidReason: z.string().nullable(),
  voidedAt: z.union([z.string(), z.date()]).nullable(),
});

export const stockMovementListItemSchema = stockMovementSelectSchema.extend({
  distributorName: z.string().nullable(),
  productName: z.string().nullable(),
  recordedByName: z.string().nullable(),
  sku: z.string().nullable(),
});

export const recordMovementSchema = z
  .object({
    productId: z.cuid2(),
    qty: z.number().int(),
    reasonNote: z.string().optional(),
    referenceId: z.string().optional(),
    referenceType: z.string().optional(),
    type: stockMovementTypeEnum,
  })
  .superRefine((value, ctx) => {
    if (value.qty === 0) {
      ctx.addIssue({
        code: "custom",
        message: "qty must be non-zero",
        path: ["qty"],
      });
      return;
    }
    if (value.type !== "adjustment" && value.qty <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "qty must be a positive integer for this movement type",
        path: ["qty"],
      });
    }
  });

export const voidMovementSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export const stockLevelSchema = z.object({
  currentQty: z.number().int(),
  distributorId: z.cuid2(),
  productId: z.cuid2(),
});

export const stockLevelsQuerySchema = z.object({
  distributorId: z.cuid2().optional(),
  productId: z.cuid2().optional(),
});

export const stockMovementQuerySchema = z.object({
  distributorId: z.cuid2().optional(),
  from: z.string().optional(),
  includeVoided: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(500).default(500),
  productId: z.cuid2().optional(),
  to: z.string().optional(),
});

export type StockMovementSelect = z.infer<typeof stockMovementSelectSchema>;
export type StockMovementListItem = z.infer<typeof stockMovementListItemSchema>;
export type RecordMovementInput = z.infer<typeof recordMovementSchema>;
export type VoidMovementInput = z.infer<typeof voidMovementSchema>;
export type StockLevel = z.infer<typeof stockLevelSchema>;
export type StockLevelsQuery = z.infer<typeof stockLevelsQuerySchema>;
export type StockMovementQuery = z.infer<typeof stockMovementQuerySchema>;
