import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db } from "./index";
import {
  account,
  customers,
  distributors,
  paymentSchedules,
  payments,
  receivables,
  session,
  user,
  verification,
} from "./schema";

// Delete in reverse FK order (idempotent)
await db.delete(payments);
await db.delete(paymentSchedules);
await db.delete(receivables);
await db.delete(customers);
await db.delete(distributors);
await db.delete(verification);
await db.delete(session);
await db.delete(account);
await db.delete(user);

const distributorIds = {
  metro: createId(),
  qc: createId(),
} as const;

const customerIds = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, createId()])
) as Record<number, string>;

const receivableIds = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [i + 1, createId()])
) as Record<number, string>;

const paymentIds = Object.fromEntries(
  Array.from({ length: 8 }, (_, i) => [i + 1, createId()])
) as Record<number, string>;

await db.insert(distributors).values([
  {
    assignedArea: "Metro Manila",
    id: distributorIds.metro,
    name: "Metro Manila Sales",
    phone: "09171234567",
    status: "active",
  },
  {
    assignedArea: "Quezon City",
    id: distributorIds.qc,
    name: "QC District",
    phone: "09281234567",
    status: "active",
  },
]);

await db.insert(customers).values([
  {
    address: "123 Rizal Ave, Manila",
    distributorId: distributorIds.metro,
    fullName: "Maria Santos",
    id: customerIds[1],
    latitude: 14.5995,
    longitude: 120.9842,
    notes: null,
    phone: "09171111111",
    riskStatus: "good",
  },
  {
    address: "456 EDSA, Quezon City",
    distributorId: distributorIds.metro,
    fullName: "Juan dela Cruz",
    id: customerIds[2],
    latitude: 14.676,
    longitude: 121.0437,
    notes: "Late on previous purchase",
    phone: "09282222222",
    riskStatus: "watchlist",
  },
  {
    address: "789 Commonwealth Ave, Quezon City",
    distributorId: distributorIds.qc,
    fullName: "Ana Reyes",
    id: customerIds[3],
    latitude: 14.7019,
    longitude: 121.045,
    notes: "Did not pay previous balance",
    phone: "09393333333",
    riskStatus: "blacklisted",
  },
  {
    address: "21 Ayala Ave, Makati",
    distributorId: distributorIds.metro,
    fullName: "Roberto Garcia",
    id: customerIds[4],
    latitude: 14.5547,
    longitude: 121.0244,
    notes: null,
    phone: "09174444444",
    riskStatus: "good",
  },
  {
    address: "5 Shaw Blvd, Mandaluyong",
    distributorId: distributorIds.metro,
    fullName: "Cecilia Mendoza",
    id: customerIds[5],
    latitude: 14.5764,
    longitude: 121.0352,
    notes: "Missed two payments",
    phone: "09285555555",
    riskStatus: "watchlist",
  },
  {
    address: "88 Malabon St, Caloocan",
    distributorId: distributorIds.qc,
    fullName: "Eduardo Villanueva",
    id: customerIds[6],
    latitude: 14.6507,
    longitude: 120.9816,
    notes: null,
    phone: "09396666666",
    riskStatus: "good",
  },
  {
    address: "34 Ortigas Ave, Pasig",
    distributorId: distributorIds.qc,
    fullName: "Lorna Castro",
    id: customerIds[7],
    latitude: 14.5794,
    longitude: 121.0684,
    notes: null,
    phone: "09177777777",
    riskStatus: "good",
  },
  {
    address: "12 Marcos Highway, Marikina",
    distributorId: distributorIds.metro,
    fullName: "Fernando Bautista",
    id: customerIds[8],
    latitude: 14.639,
    longitude: 121.0943,
    notes: null,
    phone: "09288888888",
    riskStatus: "good",
  },
  {
    address: "9 BGC High St, Taguig",
    distributorId: distributorIds.qc,
    fullName: "Gloria Flores",
    id: customerIds[9],
    latitude: 14.5211,
    longitude: 121.0505,
    notes: null,
    phone: "09399999999",
    riskStatus: "good",
  },
  {
    address: "67 Dr. A. Santos Ave, Parañaque",
    distributorId: distributorIds.metro,
    fullName: "Hernando Lopez",
    id: customerIds[10],
    latitude: 14.4793,
    longitude: 121.0198,
    notes: null,
    phone: "09170000001",
    riskStatus: "good",
  },
  {
    address: "15 Alabang-Zapote Rd, Las Piñas",
    distributorId: distributorIds.qc,
    fullName: "Isidora Perez",
    id: customerIds[11],
    latitude: 14.4386,
    longitude: 120.9936,
    notes: null,
    phone: "09280000002",
    riskStatus: "good",
  },
  {
    address: "3 Katipunan Ave, Quezon City",
    distributorId: distributorIds.metro,
    fullName: "Josefina Ramos",
    id: customerIds[12],
    latitude: 14.6137,
    longitude: 121.0785,
    notes: null,
    phone: "09390000003",
    riskStatus: "good",
  },
]);

// All monetary values stored as integer cents (PHP * 100)
// States: 3 overdue, 1 fully_paid, 5 current
await db.insert(receivables).values([
  // id:1 — current (Maria Santos, dist:1)
  {
    currentBalanceCents: 1_500_000,
    customerId: customerIds[1],
    distributorId: distributorIds.metro,
    downPaymentCents: 500_000,
    firstDueDate: "2026-02-15",
    id: receivableIds[1],
    monthlyDueAmountCents: 166_700,
    originalBalanceCents: 2_000_000,
    paymentTermMonths: 12,
    productDescription: "Living Room Set - 3-Seater Sofa + 2 Armchairs",
    saleDate: "2026-01-15",
    status: "current",
    totalAmountCents: 2_500_000,
  },
  // id:2 — overdue (Juan dela Cruz, dist:1, due 2025-07)
  {
    currentBalanceCents: 1_500_000,
    customerId: customerIds[2],
    distributorId: distributorIds.metro,
    downPaymentCents: 0,
    firstDueDate: "2025-07-01",
    id: receivableIds[2],
    monthlyDueAmountCents: 250_000,
    originalBalanceCents: 1_500_000,
    paymentTermMonths: 6,
    productDescription: "Queen Bed Frame + Mattress",
    saleDate: "2025-06-01",
    status: "overdue",
    totalAmountCents: 1_500_000,
  },
  // id:3 — overdue (Roberto Garcia, dist:1, due 2025-09)
  {
    currentBalanceCents: 800_000,
    customerId: customerIds[4],
    distributorId: distributorIds.metro,
    downPaymentCents: 200_000,
    firstDueDate: "2025-09-01",
    id: receivableIds[3],
    monthlyDueAmountCents: 130_000,
    originalBalanceCents: 1_300_000,
    paymentTermMonths: 10,
    productDescription: "Dining Table Set - 6-Seater",
    saleDate: "2025-08-01",
    status: "overdue",
    totalAmountCents: 1_500_000,
  },
  // id:4 — overdue (Cecilia Mendoza, dist:1, due 2025-11)
  {
    currentBalanceCents: 600_000,
    customerId: customerIds[5],
    distributorId: distributorIds.metro,
    downPaymentCents: 200_000,
    firstDueDate: "2025-11-01",
    id: receivableIds[4],
    monthlyDueAmountCents: 100_000,
    originalBalanceCents: 1_000_000,
    paymentTermMonths: 10,
    productDescription: "Bedroom Cabinet + Dresser",
    saleDate: "2025-10-01",
    status: "overdue",
    totalAmountCents: 1_200_000,
  },
  // id:5 — fully_paid (Eduardo Villanueva, dist:2)
  {
    currentBalanceCents: 0,
    customerId: customerIds[6],
    distributorId: distributorIds.qc,
    downPaymentCents: 300_000,
    firstDueDate: "2025-06-01",
    id: receivableIds[5],
    monthlyDueAmountCents: 120_000,
    originalBalanceCents: 1_200_000,
    paymentTermMonths: 10,
    productDescription: "Living Room Set - Sectional Sofa",
    saleDate: "2025-05-01",
    status: "fully_paid",
    totalAmountCents: 1_500_000,
  },
  // id:6 — current (Lorna Castro, dist:2)
  {
    currentBalanceCents: 900_000,
    customerId: customerIds[7],
    distributorId: distributorIds.qc,
    downPaymentCents: 100_000,
    firstDueDate: "2026-03-01",
    id: receivableIds[6],
    monthlyDueAmountCents: 100_000,
    originalBalanceCents: 1_200_000,
    paymentTermMonths: 12,
    productDescription: "Office Desk + Ergonomic Chair Set",
    saleDate: "2026-02-01",
    status: "current",
    totalAmountCents: 1_300_000,
  },
  // id:7 — current (Fernando Bautista, dist:1)
  {
    currentBalanceCents: 1_200_000,
    customerId: customerIds[8],
    distributorId: distributorIds.metro,
    downPaymentCents: 300_000,
    firstDueDate: "2026-04-01",
    id: receivableIds[7],
    monthlyDueAmountCents: 150_000,
    originalBalanceCents: 1_500_000,
    paymentTermMonths: 10,
    productDescription: "Master Bedroom Set - Bed + 2 Side Tables",
    saleDate: "2026-03-01",
    status: "current",
    totalAmountCents: 1_800_000,
  },
  // id:8 — current (Gloria Flores, dist:2)
  {
    currentBalanceCents: 400_000,
    customerId: customerIds[9],
    distributorId: distributorIds.qc,
    downPaymentCents: 100_000,
    firstDueDate: "2026-01-01",
    id: receivableIds[8],
    monthlyDueAmountCents: 100_000,
    originalBalanceCents: 800_000,
    paymentTermMonths: 8,
    productDescription: "Kids Bunk Bed + Study Desk",
    saleDate: "2025-12-01",
    status: "current",
    totalAmountCents: 900_000,
  },
  // id:9 — current (Hernando Lopez, dist:1)
  {
    currentBalanceCents: 750_000,
    customerId: customerIds[10],
    distributorId: distributorIds.metro,
    downPaymentCents: 250_000,
    firstDueDate: "2026-02-01",
    id: receivableIds[9],
    monthlyDueAmountCents: 125_000,
    originalBalanceCents: 1_000_000,
    paymentTermMonths: 8,
    productDescription: "Recliner Sofa + Center Table",
    saleDate: "2026-01-01",
    status: "current",
    totalAmountCents: 1_250_000,
  },
]);

await db.insert(payments).values([
  // rec:1 (Maria) — 1 payment of 500k
  {
    amountCents: 500_000,
    customerId: customerIds[1],
    id: paymentIds[1],
    notes: "First monthly payment",
    paymentDate: "2026-02-15",
    paymentMethod: "cash",
    receivableId: receivableIds[1],
    recordedBy: null,
    referenceNumber: null,
  },
  // rec:3 (Roberto) — 1 payment of 500k, currentBalance now 800k
  {
    amountCents: 500_000,
    customerId: customerIds[4],
    id: paymentIds[2],
    notes: null,
    paymentDate: "2025-09-15",
    paymentMethod: "gcash",
    receivableId: receivableIds[3],
    recordedBy: null,
    referenceNumber: "GC-20250915-001",
  },
  // rec:4 (Cecilia) — 1 payment of 400k, currentBalance now 600k
  {
    amountCents: 400_000,
    customerId: customerIds[5],
    id: paymentIds[3],
    notes: "Partial catch-up payment",
    paymentDate: "2025-11-10",
    paymentMethod: "bank_transfer",
    receivableId: receivableIds[4],
    recordedBy: null,
    referenceNumber: "BT-20251110-042",
  },
  // rec:5 (Eduardo) — full payment of 1,200,000 → fully_paid
  {
    amountCents: 1_200_000,
    customerId: customerIds[6],
    id: paymentIds[4],
    notes: "Full settlement",
    paymentDate: "2026-03-10",
    paymentMethod: "bank_transfer",
    receivableId: receivableIds[5],
    recordedBy: null,
    referenceNumber: "BT-20260310-007",
  },
  // rec:6 (Lorna) — 1 payment of 300k, currentBalance now 900k
  {
    amountCents: 300_000,
    customerId: customerIds[7],
    id: paymentIds[5],
    notes: null,
    paymentDate: "2026-03-05",
    paymentMethod: "cash",
    receivableId: receivableIds[6],
    recordedBy: null,
    referenceNumber: null,
  },
  // rec:7 (Fernando) — 1 payment of 300k, currentBalance now 1,200k
  {
    amountCents: 300_000,
    customerId: customerIds[8],
    id: paymentIds[6],
    notes: null,
    paymentDate: "2026-04-15",
    paymentMethod: "gcash",
    receivableId: receivableIds[7],
    recordedBy: null,
    referenceNumber: "GC-20260415-003",
  },
  // rec:8 (Gloria) — 1 payment of 400k, currentBalance now 400k
  {
    amountCents: 400_000,
    customerId: customerIds[9],
    id: paymentIds[7],
    notes: null,
    paymentDate: "2026-02-05",
    paymentMethod: "cash",
    receivableId: receivableIds[8],
    recordedBy: null,
    referenceNumber: null,
  },
  // rec:9 (Hernando) — 1 payment of 250k, currentBalance now 750k
  {
    amountCents: 250_000,
    customerId: customerIds[10],
    id: paymentIds[8],
    notes: "First payment",
    paymentDate: "2026-02-10",
    paymentMethod: "cash",
    receivableId: receivableIds[9],
    recordedBy: null,
    referenceNumber: null,
  },
]);

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeScheduleRows(
  receivableId: string,
  originalBalanceCents: number,
  paymentTermMonths: number,
  firstDueDate: string
) {
  const N = paymentTermMonths;
  const base = Math.floor(originalBalanceCents / N);
  const remainder = originalBalanceCents - base * N;
  return Array.from({ length: N }, (_, i) => ({
    dueAmountCents: i === N - 1 ? base + remainder : base,
    dueDate: addMonths(firstDueDate, i),
    installmentNo: i + 1,
    paidAmountCents: 0,
    receivableId,
    status: "pending" as const,
  }));
}

// Generate schedules for the 3 overdue + 5 current receivables
await db.insert(paymentSchedules).values([
  // rec:1 — Maria Santos, 12 months, 2,000,000 orig, first due 2026-02-15
  ...makeScheduleRows(receivableIds[1], 2_000_000, 12, "2026-02-15"),
  // rec:2 — Juan dela Cruz, 6 months, 1,500,000 orig, first due 2025-07-01
  ...makeScheduleRows(receivableIds[2], 1_500_000, 6, "2025-07-01"),
  // rec:3 — Roberto Garcia, 10 months, 1,300,000 orig, first due 2025-09-01
  ...makeScheduleRows(receivableIds[3], 1_300_000, 10, "2025-09-01"),
  // rec:4 — Cecilia Mendoza, 10 months, 1,000,000 orig, first due 2025-11-01
  ...makeScheduleRows(receivableIds[4], 1_000_000, 10, "2025-11-01"),
  // rec:6 — Lorna Castro, 12 months, 1,200,000 orig, first due 2026-03-01
  ...makeScheduleRows(receivableIds[6], 1_200_000, 12, "2026-03-01"),
  // rec:7 — Fernando Bautista, 10 months, 1,500,000 orig, first due 2026-04-01
  ...makeScheduleRows(receivableIds[7], 1_500_000, 10, "2026-04-01"),
  // rec:8 — Gloria Flores, 8 months, 800,000 orig, first due 2026-01-01
  ...makeScheduleRows(receivableIds[8], 800_000, 8, "2026-01-01"),
  // rec:9 — Hernando Lopez, 8 months, 1,000,000 orig, first due 2026-02-01
  ...makeScheduleRows(receivableIds[9], 1_000_000, 8, "2026-02-01"),
]);

// Create auth users via better-auth API
const seedAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  secret: "seed-only-not-used-for-tokens",
  user: {
    additionalFields: {
      distributorId: { required: false, type: "string" },
      role: {
        defaultValue: "admin",
        input: false,
        required: true,
        type: "string",
      },
    },
  },
});

await seedAuth.api.signUpEmail({
  body: { email: "admin@demo.local", name: "Admin", password: "demo1234" },
});

await seedAuth.api.signUpEmail({
  body: { email: "dist@demo.local", name: "Distributor", password: "demo1234" },
});

// Set role + distributorId for distributor user (input:false prevents setting via signUpEmail body)
await db
  .update(user)
  .set({ distributorId: distributorIds.metro, role: "distributor" })
  .where(eq(user.email, "dist@demo.local"));

console.log("Seed complete.");
