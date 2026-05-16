import { zValidator } from "@hono/zod-validator";
import {
  db,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { paymentInsertSchema } from "schema";

import { isDistributorOwner } from "../lib/guards";
import type { AuthVariables } from "../middleware/auth";
import { requireSession } from "../middleware/auth";

export const payments = new Hono<{ Variables: AuthVariables }>()
  .get("/", (c) => c.json([]))
  .post(
    "/",
    requireSession,
    zValidator("json", paymentInsertSchema),
    async (c) => {
      const user = c.get("user");
      const data = c.req.valid("json");

      const result = await db.transaction(async (tx) => {
        const [receivable] = await tx
          .select({
            currentBalanceCents: receivablesTable.currentBalanceCents,
            customerId: receivablesTable.customerId,
            distributorId: receivablesTable.distributorId,
            id: receivablesTable.id,
            status: receivablesTable.status,
          })
          .from(receivablesTable)
          .where(eq(receivablesTable.id, data.receivableId));

        if (!receivable) {
          return { error: "Receivable not found", status: 404 } as const;
        }

        if (!isDistributorOwner(user, receivable.distributorId)) {
          return { error: "Forbidden", status: 403 } as const;
        }

        if (receivable.status === "fully_paid") {
          return {
            error: "Receivable is already fully paid",
            status: 400,
          } as const;
        }

        if (data.amountCents > receivable.currentBalanceCents) {
          return {
            error: `Amount exceeds current balance of ${receivable.currentBalanceCents} cents`,
            status: 400,
          } as const;
        }

        const [payment] = await tx
          .insert(paymentsTable)
          .values({
            amountCents: data.amountCents,
            customerId: receivable.customerId,
            notes: data.notes ?? null,
            paymentDate: data.paymentDate,
            paymentMethod: data.paymentMethod,
            receivableId: data.receivableId,
            recordedBy: user.id,
            referenceNumber: data.referenceNumber ?? null,
          })
          .returning();

        if (!payment) {
          throw new Error("Failed to insert payment");
        }

        const newBalance = receivable.currentBalanceCents - data.amountCents;
        const newStatus = newBalance === 0 ? "fully_paid" : receivable.status;

        await tx
          .update(receivablesTable)
          .set({ currentBalanceCents: newBalance, status: newStatus })
          .where(eq(receivablesTable.id, data.receivableId));

        return {
          data: { ...payment, customerId: receivable.customerId },
          status: 201,
        } as const;
      });

      if (result.status !== 201) {
        return c.json({ error: result.error }, result.status);
      }

      return c.json(result.data, 201);
    }
  );
