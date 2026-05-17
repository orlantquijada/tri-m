import { sql } from "drizzle-orm";
import { index, int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestampFields = {
  createdAt: int({ mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('now') * 1000)`)
    .$defaultFn(() => new Date()),
  updatedAt: int({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

export const distributors = sqliteTable("distributors", {
  assignedArea: text(),
  ...timestampFields,
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  phone: text().notNull(),
  status: text({ enum: ["active", "inactive"] })
    .notNull()
    .default("active"),
});

export const customers = sqliteTable("customers", {
  address: text().notNull(),
  ...timestampFields,
  distributorId: int()
    .references(() => distributors.id)
    .notNull(),
  fullName: text().notNull(),
  id: int().primaryKey({ autoIncrement: true }),
  latitude: real(),
  longitude: real(),
  notes: text(),
  phone: text().notNull(),
  riskStatus: text({ enum: ["good", "watchlist", "blacklisted"] })
    .notNull()
    .default("good"),
});

export const receivables = sqliteTable("receivables", {
  ...timestampFields,
  currentBalanceCents: int().notNull(),
  customerId: int()
    .references(() => customers.id)
    .notNull(),
  distributorId: int()
    .references(() => distributors.id)
    .notNull(),
  downPaymentCents: int().notNull().default(0),
  firstDueDate: text().notNull(),
  id: int().primaryKey({ autoIncrement: true }),
  monthlyDueAmountCents: int(),
  originalBalanceCents: int().notNull(),
  paymentTermMonths: int(),
  productDescription: text().notNull(),
  saleDate: text().notNull(),
  status: text({ enum: ["current", "overdue", "fully_paid"] })
    .notNull()
    .default("current"),
  totalAmountCents: int().notNull(),
});

export const paymentSchedules = sqliteTable(
  "payment_schedules",
  {
    ...timestampFields,
    dueAmountCents: int().notNull(),
    dueDate: text().notNull(),
    id: int().primaryKey({ autoIncrement: true }),
    installmentNo: int().notNull(),
    paidAmountCents: int().notNull().default(0),
    receivableId: int()
      .references(() => receivables.id)
      .notNull(),
    status: text({ enum: ["pending", "partial", "paid", "overdue"] })
      .notNull()
      .default("pending"),
  },
  (table) => [
    index("payment_schedules_receivable_id_idx").on(table.receivableId),
  ]
);

export const blacklistRequests = sqliteTable("blacklist_requests", {
  createdAt: int({ mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('now') * 1000)`)
    .$defaultFn(() => new Date()),
  customerId: int()
    .references(() => customers.id)
    .notNull(),
  distributorId: int()
    .references(() => distributors.id)
    .notNull(),
  id: int().primaryKey({ autoIncrement: true }),
  reason: text().notNull(),
  requestedByUserId: text().notNull(),
  reviewNote: text(),
  reviewedAt: int({ mode: "timestamp_ms" }),
  reviewedByUserId: text(),
  status: text({ enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
});

export const payments = sqliteTable("payments", {
  amountCents: int().notNull(),
  ...timestampFields,
  customerId: int()
    .references(() => customers.id)
    .notNull(),
  id: int().primaryKey({ autoIncrement: true }),
  notes: text(),
  paymentDate: text().notNull(),
  paymentMethod: text({
    enum: ["cash", "gcash", "bank_transfer", "other"],
  }).notNull(),
  receivableId: int()
    .references(() => receivables.id)
    .notNull(),
  recordedBy: text(),
  referenceNumber: text(),
  voidedAt: text(),
  voidReason: text(),
});
