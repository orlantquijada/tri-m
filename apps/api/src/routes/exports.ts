import { CUSTOMER_CSV_COLUMNS, OVERDUE_CSV_COLUMNS } from "schema";
import type { CustomerCsvRow, OverdueCsvRow } from "schema";

import { toCsv } from "../lib/csv";
import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import { listCustomersForExport } from "../services/customers";
import { listOverdue } from "../services/overdue";

const EXPORT_ROW_LIMIT = 10_000;

export const csvExports = createRouter()
  .get("/overdue.csv", requireSession, async (c) => {
    const { rows } = await listOverdue(c.get("user"), {
      limit: EXPORT_ROW_LIMIT,
    });
    const csvRows: Record<string, unknown>[] = rows.map(
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
    const rows = await listCustomersForExport(c.get("user"), EXPORT_ROW_LIMIT);
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
