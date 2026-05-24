import { z } from "zod";

export const riskStatusEnum = z.enum(["good", "watchlist", "blacklisted"]);
export type RiskStatus = z.infer<typeof riskStatusEnum>;

export const distributorStatusEnum = z.enum(["active", "inactive"]);
export type DistributorStatus = z.infer<typeof distributorStatusEnum>;

export const receivableStatusEnum = z.enum([
  "current",
  "overdue",
  "fully_paid",
]);
export type ReceivableStatus = z.infer<typeof receivableStatusEnum>;

export const paymentMethodEnum = z.enum([
  "cash",
  "gcash",
  "bank_transfer",
  "other",
]);
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

export const productStatusEnum = z.enum(["active", "archived"]);
export type ProductStatus = z.infer<typeof productStatusEnum>;
