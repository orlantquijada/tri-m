import { z } from "zod";

import { productStatusEnum } from "./enums";

export const productSelectSchema = z.object({
  createdAt: z.union([z.string(), z.date()]),
  description: z.string().nullable(),
  distributorId: z.cuid2(),
  id: z.cuid2(),
  name: z.string(),
  sku: z.string(),
  status: productStatusEnum,
  unitPriceCents: z.number().int().nullable(),
  updatedAt: z.union([z.string(), z.date()]),
});

export const productListItemSchema = productSelectSchema.extend({
  currentQty: z.number().int(),
  distributorName: z.string().nullable(),
});

export const productInsertSchema = z.object({
  description: z.string().nullable().optional(),
  distributorId: z.cuid2().optional(),
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  unitPriceCents: z.number().int().min(0).nullable().optional(),
});

export const productUpdateSchema = productInsertSchema
  .omit({ distributorId: true, sku: true })
  .partial();

export const productQuerySchema = z.object({
  distributorId: z.cuid2().optional(),
  search: z.string().optional(),
  status: productStatusEnum.optional(),
});

export type ProductSelect = z.infer<typeof productSelectSchema>;
export type ProductListItem = z.infer<typeof productListItemSchema>;
export type ProductInsert = z.infer<typeof productInsertSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
