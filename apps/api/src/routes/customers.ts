import { zValidator } from "@hono/zod-validator";
import { customers as customersTable, db, receivables } from "db";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { customerInsertSchema, customerUpdateSchema } from "schema";

import { isDistributorOwner } from "../lib/guards";
import { requireSession } from "../middleware/auth";
import type { AuthVariables } from "../middleware/auth";

export const customers = new Hono<{ Variables: AuthVariables }>()
  .get("/", requireSession, async (c) => {
    const user = c.get("user");

    const scopeFilter =
      user.role === "distributor" && typeof user.distributorId === "number"
        ? eq(customersTable.distributorId, user.distributorId)
        : undefined;

    const rows = await db
      .select({
        address: customersTable.address,
        distributorId: customersTable.distributorId,
        fullName: customersTable.fullName,
        id: customersTable.id,
        latitude: customersTable.latitude,
        longitude: customersTable.longitude,
        notes: customersTable.notes,
        outstandingBalanceCents: sql<number>`coalesce(sum(${receivables.currentBalanceCents}), 0)`,
        phone: customersTable.phone,
        riskStatus: customersTable.riskStatus,
      })
      .from(customersTable)
      .leftJoin(receivables, eq(receivables.customerId, customersTable.id))
      .where(scopeFilter)
      .groupBy(customersTable.id);

    return c.json(rows);
  })
  .get("/:id", requireSession, async (c) => {
    const user = c.get("user");
    const id = Number.parseInt(c.req.param("id"), 10);

    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, id));

    if (!customer) {
      return c.json({ error: "Not found" }, 404);
    }
    if (!isDistributorOwner(user, customer.distributorId)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const customerReceivables = await db
      .select({
        currentBalanceCents: receivables.currentBalanceCents,
        firstDueDate: receivables.firstDueDate,
        id: receivables.id,
        originalBalanceCents: receivables.originalBalanceCents,
        productDescription: receivables.productDescription,
        saleDate: receivables.saleDate,
        status: receivables.status,
      })
      .from(receivables)
      .where(eq(receivables.customerId, id));

    return c.json({ ...customer, receivables: customerReceivables });
  })
  .post(
    "/",
    requireSession,
    zValidator("json", customerInsertSchema),
    async (c) => {
      const user = c.get("user");
      const data = c.req.valid("json");

      let distributorId: number;
      if (user.role === "distributor") {
        if (!user.distributorId) {
          return c.json({ error: "No distributor assigned" }, 403);
        }
        ({ distributorId } = user);
      } else {
        if (!data.distributorId) {
          return c.json({ error: "distributorId is required" }, 400);
        }
        ({ distributorId } = data);
      }

      const [customer] = await db
        .insert(customersTable)
        .values({
          address: data.address,
          distributorId,
          fullName: data.fullName,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          notes: data.notes ?? null,
          phone: data.phone,
          riskStatus: data.riskStatus ?? "good",
        })
        .returning();

      return c.json(customer, 201);
    }
  )
  .patch(
    "/:id",
    requireSession,
    zValidator("json", customerUpdateSchema),
    async (c) => {
      const user = c.get("user");
      const id = Number.parseInt(c.req.param("id"), 10);
      const data = c.req.valid("json");

      const [existing] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, id));

      if (!existing) {
        return c.json({ error: "Not found" }, 404);
      }
      if (!isDistributorOwner(user, existing.distributorId)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const [updated] = await db
        .update(customersTable)
        .set({
          ...data,
          latitude: data.latitude ?? existing.latitude,
          longitude: data.longitude ?? existing.longitude,
          notes: data.notes ?? existing.notes,
        })
        .where(eq(customersTable.id, id))
        .returning();

      return c.json(updated);
    }
  );
