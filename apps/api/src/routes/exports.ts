import {
  customers as customersTable,
  db,
  distributors as distributorsTable,
} from "db";
import { eq } from "drizzle-orm";
import { CUSTOMER_CSV_COLUMNS, OVERDUE_CSV_COLUMNS } from "schema";
import type { CustomerCsvRow, OverdueCsvRow } from "schema";

import { createRouter } from "../lib/factory";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";
import { listOverdue } from "../services/overdue";

function escapeField(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/u.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function toCsv(
  columns: readonly string[],
  rows: Record<string, unknown>[]
): string {
  const header = [...columns].join(",");
  const body = rows
    .map((row) => [...columns].map((col) => escapeField(row[col])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export const csvExports = createRouter()
  .get("/overdue.csv", requireSession, async (c) => {
    const { rows } = await listOverdue(c.get("user"));
    const csvRows: Record<string, unknown>[] = rows.slice(0, 10_000).map(
      (r): OverdueCsvRow => ({
        address: r.address,
        current_balance_cents: r.currentBalanceCents,
        customer_name: r.customerName,
        days_overdue: r.daysOverdue,
        distributor: r.distributorName,
        first_due_date: r.firstDueDate,
        phone: r.phone,
        product: r.productDescription,
        status: r.status,
        total_cents: r.totalAmountCents,
      })
    );

    return c.body(toCsv(OVERDUE_CSV_COLUMNS, csvRows), 200, {
      "Content-Disposition": `attachment; filename="overdue.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    });
  })
  .get("/customers.csv", requireSession, async (c) => {
    const user = c.get("user");
    const scope = Scope.forUser(user);

    const rows = await db
      .select({
        address: customersTable.address,
        distributorName: distributorsTable.name,
        fullName: customersTable.fullName,
        latitude: customersTable.latitude,
        longitude: customersTable.longitude,
        phone: customersTable.phone,
        riskStatus: customersTable.riskStatus,
      })
      .from(customersTable)
      .innerJoin(
        distributorsTable,
        eq(customersTable.distributorId, distributorsTable.id)
      )
      .where(scope.filterQuery(customersTable.distributorId))
      .limit(10_000);

    const csvRows: Record<string, unknown>[] = rows.map(
      (r): CustomerCsvRow => ({
        address: r.address,
        distributor: r.distributorName,
        full_name: r.fullName,
        latitude: r.latitude,
        longitude: r.longitude,
        phone: r.phone,
        risk_status: r.riskStatus,
      })
    );

    return c.body(toCsv(CUSTOMER_CSV_COLUMNS, csvRows), 200, {
      "Content-Disposition": `attachment; filename="customers.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    });
  });
