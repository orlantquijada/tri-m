import { zValidator } from "@hono/zod-validator";
import {
  customers as customersTable,
  db,
  receivables as receivablesTable,
} from "db";
import { eq } from "drizzle-orm";
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
