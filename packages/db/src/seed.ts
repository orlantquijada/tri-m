import { db } from "./index";
import {
  customers,
  distributors,
  payments,
  receivables,
} from "./schema/domain";

// Delete in reverse FK order (idempotent)
await db.delete(payments);
await db.delete(receivables);
await db.delete(customers);
await db.delete(distributors);

await db.insert(distributors).values([
  {
    assignedArea: "Metro Manila",
    id: 1,
    name: "Metro Manila Sales",
    phone: "09171234567",
    status: "active",
  },
  {
    assignedArea: "Quezon City",
    id: 2,
    name: "QC District",
    phone: "09281234567",
    status: "active",
  },
]);

await db.insert(customers).values([
  {
    address: "123 Rizal Ave, Manila",
    distributorId: 1,
    fullName: "Maria Santos",
    id: 1,
    latitude: 14.5995,
    longitude: 120.9842,
    notes: null,
    phone: "09171111111",
    riskStatus: "good",
  },
  {
    address: "456 EDSA, Quezon City",
    distributorId: 1,
    fullName: "Juan dela Cruz",
    id: 2,
    latitude: 14.676,
    longitude: 121.0437,
    notes: "Late on previous purchase",
    phone: "09282222222",
    riskStatus: "watchlist",
  },
  {
    address: "789 Commonwealth Ave, Quezon City",
    distributorId: 2,
    fullName: "Ana Reyes",
    id: 3,
    latitude: 14.7019,
    longitude: 121.045,
    notes: "Did not pay previous balance",
    phone: "09393333333",
    riskStatus: "blacklisted",
  },
]);

// Amounts in integer cents (PHP * 100)
await db.insert(receivables).values([
  {
    currentBalanceCents: 1_500_000, // 15,000 PHP (after one payment)
    customerId: 1,
    distributorId: 1,
    downPaymentCents: 500_000, // 5,000 PHP
    firstDueDate: "2026-02-15",
    id: 1,
    monthlyDueAmountCents: 166_700, // ~1,667 PHP
    originalBalanceCents: 2_000_000, // 20,000 PHP
    paymentTermMonths: 12,
    productDescription: "Living Room Set - 3-Seater Sofa + 2 Armchairs",
    saleDate: "2026-01-15",
    status: "current",
    totalAmountCents: 2_500_000, // 25,000 PHP
  },
  {
    currentBalanceCents: 1_500_000,
    customerId: 2,
    distributorId: 1,
    downPaymentCents: 0,
    firstDueDate: "2025-07-01", // past → overdue
    id: 2,
    monthlyDueAmountCents: 250_000, // 2,500 PHP
    originalBalanceCents: 1_500_000,
    paymentTermMonths: 6,
    productDescription: "Queen Bed Frame + Mattress",
    saleDate: "2025-06-01",
    status: "overdue",
    totalAmountCents: 1_500_000, // 15,000 PHP
  },
]);

await db.insert(payments).values([
  {
    amountCents: 500_000, // 5,000 PHP
    customerId: 1,
    id: 1,
    notes: "First monthly payment",
    paymentDate: "2026-02-15",
    paymentMethod: "cash",
    receivableId: 1,
    recordedBy: null,
    referenceNumber: null,
  },
]);

// Admin + distributor users are seeded in task 0c via better-auth

console.log("Seed complete.");
