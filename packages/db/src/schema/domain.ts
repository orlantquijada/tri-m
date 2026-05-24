import { createId } from "@paralleldrive/cuid2";
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
  id: text()
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text().notNull(),
  phone: text().notNull(),
  status: text({ enum: ["active", "inactive"] })
    .notNull()
    .default("active"),
});

export const customers = sqliteTable("customers", {
  address: text().notNull(),
  ...timestampFields,
  distributorId: text()
    .references(() => distributors.id)
    .notNull(),
  fullName: text().notNull(),
  id: text()
    .primaryKey()
    .$defaultFn(() => createId()),
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
  customerId: text()
    .references(() => customers.id)
    .notNull(),
  distributorId: text()
    .references(() => distributors.id)
    .notNull(),
  downPaymentCents: int().notNull().default(0),
  firstDueDate: text().notNull(),
  id: text()
    .primaryKey()
    .$defaultFn(() => createId()),
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
    id: text()
      .primaryKey()
      .$defaultFn(() => createId()),
    installmentNo: int().notNull(),
    paidAmountCents: int().notNull().default(0),
    receivableId: text()
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
  customerId: text()
    .references(() => customers.id)
    .notNull(),
  distributorId: text()
    .references(() => distributors.id)
    .notNull(),
  id: text()
    .primaryKey()
    .$defaultFn(() => createId()),
  reason: text().notNull(),
  requestedByUserId: text().notNull(),
  reviewNote: text(),
  reviewedAt: int({ mode: "timestamp_ms" }),
  reviewedByUserId: text(),
  status: text({ enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
});

export const auditEvents = sqliteTable(
  "audit_events",
  {
    actorId: text().notNull(),
    createdAt: int({ mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`)
      .$defaultFn(() => new Date()),
    distributorId: text(),
    entityId: text().notNull(),
    entityType: text({
      enum: ["payment", "customer", "blacklist_request", "user"],
    }).notNull(),
    event: text().notNull(),
    id: text()
      .primaryKey()
      .$defaultFn(() => createId()),
    metadata: text(),
  },
  (table) => [
    index("audit_events_created_at_idx").on(table.createdAt),
    index("audit_events_entity_idx").on(table.entityType, table.entityId),
  ]
);

export const visits = sqliteTable(
  "visits",
  {
    createdAt: int({ mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`)
      .$defaultFn(() => new Date()),
    customerId: text()
      .references(() => customers.id)
      .notNull(),
    distributorId: text()
      .references(() => distributors.id)
      .notNull(),
    gpsLat: real(),
    gpsLng: real(),
    id: text()
      .primaryKey()
      .$defaultFn(() => createId()),
    notes: text(),
    outcome: text({
      enum: [
        "paid",
        "promised",
        "no_answer",
        "refused",
        "wrong_contact",
        "other",
      ],
    }).notNull(),
    promiseResolvedAt: int({ mode: "timestamp_ms" }),
    promisedAmountCents: int(),
    promisedDate: text(),
    recordedByUserId: text().notNull(),
    type: text({ enum: ["in_person", "phone", "sms", "other"] }).notNull(),
  },
  (table) => [
    index("visits_customer_created_at_idx").on(
      table.customerId,
      table.createdAt
    ),
    index("visits_open_promise_idx").on(
      table.distributorId,
      table.promiseResolvedAt,
      table.promisedDate
    ),
  ]
);

export const payments = sqliteTable("payments", {
  amountCents: int().notNull(),
  ...timestampFields,
  customerId: text()
    .references(() => customers.id)
    .notNull(),
  id: text()
    .primaryKey()
    .$defaultFn(() => createId()),
  notes: text(),
  paymentDate: text().notNull(),
  paymentMethod: text({
    enum: ["cash", "gcash", "bank_transfer", "other"],
  }).notNull(),
  receivableId: text()
    .references(() => receivables.id)
    .notNull(),
  recordedBy: text(),
  referenceNumber: text(),
  voidReason: text(),
  voidedAt: text(),
});
