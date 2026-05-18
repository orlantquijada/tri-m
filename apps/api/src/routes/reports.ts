import { zValidator } from "@hono/zod-validator";
import {
  customers as customersTable,
  db,
  distributors as distributorsTable,
  paymentSchedules as paymentSchedulesTable,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import {
  and,
  eq,
  exists,
  gte,
  gt,
  inArray,
  isNull,
  lte,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { distributorPerformanceRowSchema } from "schema";
import { z } from "zod";

import { createRouter } from "../lib/factory";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const reports = createRouter().get(
  "/distributor-performance",
  requireSession,
  zValidator("query", querySchema),
  async (c) => {
    Scope.forUser(c.get("user")).assertAdmin();
    const { from, to } = c.req.valid("query");

    const statsPromise = db
      .select({
        customerCount:
          sql<number>`count(distinct ${customersTable.id})`.mapWith(Number),
        distributorId: distributorsTable.id,
        distributorName: distributorsTable.name,
        originalBalanceCents:
          sql<number>`coalesce(sum(${receivablesTable.originalBalanceCents}), 0)`.mapWith(
            Number
          ),
        outstandingCents:
          sql<number>`coalesce(sum(${receivablesTable.currentBalanceCents}), 0)`.mapWith(
            Number
          ),
      })
      .from(distributorsTable)
      .leftJoin(
        customersTable,
        eq(customersTable.distributorId, distributorsTable.id)
      )
      .leftJoin(
        receivablesTable,
        eq(receivablesTable.customerId, customersTable.id)
      )
      .groupBy(distributorsTable.id);

    const paymentConditions: SQL[] = [isNull(paymentsTable.voidedAt)];
    if (from) {
      paymentConditions.push(gte(paymentsTable.paymentDate, from));
    }
    if (to) {
      paymentConditions.push(lte(paymentsTable.paymentDate, to));
    }

    const collectedPromise = db
      .select({
        collectedCents:
          sql<number>`coalesce(sum(${paymentsTable.amountCents}), 0)`.mapWith(
            Number
          ),
        distributorId: receivablesTable.distributorId,
      })
      .from(paymentsTable)
      .innerJoin(
        receivablesTable,
        eq(paymentsTable.receivableId, receivablesTable.id)
      )
      .where(and(...paymentConditions))
      .groupBy(receivablesTable.distributorId);

    const overduePromise = db
      .select({
        distributorId: receivablesTable.distributorId,
        overdueCents:
          sql<number>`coalesce(sum(${receivablesTable.currentBalanceCents}), 0)`.mapWith(
            Number
          ),
      })
      .from(receivablesTable)
      .where(
        and(
          gt(receivablesTable.currentBalanceCents, 0),
          or(
            exists(
              db
                .select({ id: paymentSchedulesTable.id })
                .from(paymentSchedulesTable)
                .where(
                  and(
                    eq(paymentSchedulesTable.receivableId, receivablesTable.id),
                    inArray(paymentSchedulesTable.status, [
                      "pending",
                      "partial",
                    ]),
                    sql`date(${paymentSchedulesTable.dueDate}) < date('now')`
                  )
                )
            ),
            and(
              sql`date(${receivablesTable.firstDueDate}) < date('now')`,
              notExists(
                db
                  .select({ id: paymentSchedulesTable.id })
                  .from(paymentSchedulesTable)
                  .where(
                    eq(paymentSchedulesTable.receivableId, receivablesTable.id)
                  )
              )
            )
          )
        )
      )
      .groupBy(receivablesTable.distributorId);

    const [statsRows, collectedRows, overdueRows] = await Promise.all([
      statsPromise,
      collectedPromise,
      overduePromise,
    ]);

    const collectedMap = new Map(
      collectedRows.map((r) => [r.distributorId, r.collectedCents])
    );
    const overdueMap = new Map(
      overdueRows.map((r) => [r.distributorId, r.overdueCents])
    );

    const rows = statsRows.map((s) => {
      const collectedCents = collectedMap.get(s.distributorId) ?? 0;
      const overdueCents = overdueMap.get(s.distributorId) ?? 0;
      const collectionRatePct =
        s.originalBalanceCents > 0
          ? (collectedCents / s.originalBalanceCents) * 100
          : 0;
      return {
        ...s,
        collectedCents,
        collectionRatePct: Math.round(collectionRatePct * 10) / 10,
        overdueCents,
      };
    });

    return c.json(distributorPerformanceRowSchema.array().parse(rows));
  }
);
