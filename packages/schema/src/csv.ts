export type OverdueCsvRow = {
  address: string;
  current_balance_cents: number;
  customer_name: string;
  days_overdue: number;
  distributor: string;
  first_due_date: string;
  phone: string;
  product: string;
  status: string;
  total_cents: number;
};

export type CustomerCsvRow = {
  address: string;
  distributor: string;
  full_name: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  risk_status: string;
};

export type ProductCsvRow = {
  id: string;
  distributor_id: string;
  distributor_name: string;
  name: string;
  sku: string;
  description: string | null;
  unit_price_cents: number | null;
  current_qty: number;
  status: string;
  created_at: string;
};

export type StockMovementCsvRow = {
  id: string;
  product_id: string;
  product_name: string | null;
  sku: string | null;
  distributor_id: string;
  distributor_name: string | null;
  type: string;
  qty: number;
  reason_note: string | null;
  reference_type: string | null;
  reference_id: string | null;
  recorded_by: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
};

export const OVERDUE_CSV_COLUMNS = [
  "customer_name",
  "phone",
  "address",
  "distributor",
  "product",
  "total_cents",
  "current_balance_cents",
  "first_due_date",
  "days_overdue",
  "status",
] as const satisfies readonly (keyof OverdueCsvRow)[];

export const CUSTOMER_CSV_COLUMNS = [
  "full_name",
  "phone",
  "address",
  "latitude",
  "longitude",
  "distributor",
  "risk_status",
] as const satisfies readonly (keyof CustomerCsvRow)[];

export const PRODUCTS_CSV_COLUMNS = [
  "id",
  "distributor_id",
  "distributor_name",
  "name",
  "sku",
  "description",
  "unit_price_cents",
  "current_qty",
  "status",
  "created_at",
] as const satisfies readonly (keyof ProductCsvRow)[];

export const STOCK_MOVEMENTS_CSV_COLUMNS = [
  "id",
  "product_id",
  "product_name",
  "sku",
  "distributor_id",
  "distributor_name",
  "type",
  "qty",
  "reason_note",
  "reference_type",
  "reference_id",
  "recorded_by",
  "created_at",
  "voided_at",
  "void_reason",
] as const satisfies readonly (keyof StockMovementCsvRow)[];
