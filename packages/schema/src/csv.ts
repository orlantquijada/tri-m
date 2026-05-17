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
