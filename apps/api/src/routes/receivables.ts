import { zValidator } from "@hono/zod-validator";
import {
  customers as customersTable,
  db,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { receivableInsertSchema } from "schema";
import { z } from "zod";

import { isDistributorOwner } from "../lib/guards";
import type { AuthVariables } from "../middleware/auth";
import { requireSession } from "../middleware/auth";

const postBodySchema = receivableInsertSchema.extend({
  adminOverride: z.boolean().optional().default(false),
});

export const receivables = new Hono<{ Variables: AuthVariables }>()
  .get("/", requireSession, (c) => c.json([]))
  .get("/:id", requireSession, async (c) => {
    const user = c.get("user");
    const id = Number(c.req.param("id"));

    const [receivable] = await db
      .select()
      .from(receivablesTable)
      .where(eq(receivablesTable.id, id));

    if (!receivable) {
      return c.json({ error: "Not found" }, 404);
    }

    if (!isDistributorOwner(user, receivable.distributorId)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const [customer] = await db
      .select({
        address: customersTable.address,
        fullName: customersTable.fullName,
        id: customersTable.id,
        phone: customersTable.phone,
        riskStatus: customersTable.riskStatus,
      })
      .from(customersTable)
      .where(eq(customersTable.id, receivable.customerId));

    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.receivableId, id))
      .orderBy(desc(paymentsTable.paymentDate));

    return c.json({ ...receivable, customer, payments });
  })
  .post("/", requireSession, zValidator("json", postBodySchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, data.customerId));

    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }

    if (!isDistributorOwner(user, customer.distributorId)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (customer.riskStatus === "blacklisted" && user.role === "distributor") {
      return c.json(
        { error: "Cannot create receivable for blacklisted customer" },
        403
      );
    }

    const originalBalanceCents = data.totalAmountCents - data.downPaymentCents;

    const [receivable] = await db
      .insert(receivablesTable)
      .values({
        currentBalanceCents: originalBalanceCents,
        customerId: data.customerId,
        distributorId: customer.distributorId,
        downPaymentCents: data.downPaymentCents,
        firstDueDate: data.firstDueDate,
        monthlyDueAmountCents: data.monthlyDueAmountCents ?? null,
        originalBalanceCents,
        paymentTermMonths: data.paymentTermMonths ?? null,
        productDescription: data.productDescription,
        saleDate: data.saleDate,
        status: "current",
        totalAmountCents: data.totalAmountCents,
      })
      .returning();

    return c.json(receivable, 201);
  });
