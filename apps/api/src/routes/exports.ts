import { zValidator } from "@hono/zod-validator";
import {
  CUSTOMER_CSV_COLUMNS,
  OVERDUE_CSV_COLUMNS,
  PRODUCTS_CSV_COLUMNS,
  STOCK_MOVEMENTS_CSV_COLUMNS,
} from "schema";
import type {
  CustomerCsvRow,
  OverdueCsvRow,
  ProductCsvRow,
  StockMovementCsvRow,
} from "schema";
import { z } from "zod";

import { toCsv } from "../lib/csv";
import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import { listCustomersForExport } from "../services/customers";
import { listOverdue } from "../services/overdue";
import { listProductsForExport } from "../services/products";
import { listMovementsForExport } from "../services/stock";

const EXPORT_ROW_LIMIT = 10_000;

const productsCsvQuerySchema = z.object({
  distributorId: z.cuid2().optional(),
});

const stockMovementsCsvQuerySchema = z.object({
  distributorId: z.cuid2().optional(),
  from: z.string().optional(),
  productId: z.cuid2().optional(),
  to: z.string().optional(),
});

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
  })
  .get(
    "/products.csv",
    requireSession,
    zValidator("query", productsCsvQuerySchema),
    async (c) => {
      const rows = await listProductsForExport(
        c.get("user"),
        c.req.valid("query"),
        EXPORT_ROW_LIMIT
      );
      const csvRows: Record<string, unknown>[] = rows.map(
        (r): ProductCsvRow => ({
          created_at: r.createdAt.toISOString(),
          current_qty: r.currentQty,
          description: r.description,
          distributor_id: r.distributorId,
          distributor_name: r.distributorName,
          id: r.id,
          name: r.name,
          sku: r.sku,
          status: r.status,
          unit_price_cents: r.unitPriceCents,
        })
      );

      return c.body(toCsv(PRODUCTS_CSV_COLUMNS, csvRows), 200, {
        "Content-Disposition": `attachment; filename="products.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      });
    }
  )
  .get(
    "/stock-movements.csv",
    requireSession,
    zValidator("query", stockMovementsCsvQuerySchema),
    async (c) => {
      const rows = await listMovementsForExport(
        c.get("user"),
        c.req.valid("query"),
        EXPORT_ROW_LIMIT
      );
      const csvRows: Record<string, unknown>[] = rows.map(
        (r): StockMovementCsvRow => ({
          created_at: r.createdAt.toISOString(),
          distributor_id: r.distributorId,
          distributor_name: r.distributorName,
          id: r.id,
          product_id: r.productId,
          product_name: r.productName,
          qty: r.qty,
          reason_note: r.reasonNote,
          recorded_by: r.recordedByName,
          reference_id: r.referenceId,
          reference_type: r.referenceType,
          sku: r.sku,
          type: r.type,
          void_reason: r.voidReason,
          voided_at: r.voidedAt?.toISOString() ?? null,
        })
      );

      return c.body(toCsv(STOCK_MOVEMENTS_CSV_COLUMNS, csvRows), 200, {
        "Content-Disposition": `attachment; filename="stock-movements.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      });
    }
  );
