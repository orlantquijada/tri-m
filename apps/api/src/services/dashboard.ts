import {
  customers as customersTable,
  db,
  paymentSchedules as paymentSchedulesTable,
  payments as paymentsTable,
  receivables as receivablesTable,
  visits as visitsTable,
} from "db";
import { and, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";

export async function getDashboardTotals(user: User) {
  const scope = Scope.forUser(user).filterQuery(receivablesTable.distributorId);

  const [recAgg] = await db
    .select({
      outstandingCents: sql<number>`coalesce(sum(case when ${receivablesTable.status} != 'fully_paid' then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      overdueCents: sql<number>`coalesce(sum(case when ${receivablesTable.currentBalanceCents} > 0 and date(${receivablesTable.firstDueDate}) < date('now') then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      totalReceivablesCents: sql<number>`coalesce(sum(${receivablesTable.totalAmountCents}), 0)`,
    })
    .from(receivablesTable)
    .where(scope);

  const [payAgg] = await db
    .select({
      totalCollectedCents: sql<number>`coalesce(sum(${paymentsTable.amountCents}), 0)`,
    })
    .from(paymentsTable)
    .innerJoin(
      receivablesTable,
      eq(paymentsTable.receivableId, receivablesTable.id)
    )
    .where(scope);

  return {
    outstandingCents: recAgg?.outstandingCents ?? 0,
    overdueCents: recAgg?.overdueCents ?? 0,
    totalCollectedCents: payAgg?.totalCollectedCents ?? 0,
    totalReceivablesCents: recAgg?.totalReceivablesCents ?? 0,
  };
}

export async function getAgingBuckets(user: User) {
  const scope = Scope.forUser(user);

  const [row] = await db
    .select({
      bucket0_30Cents: sql<number>`coalesce(sum(case when cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer) between 1 and 30 then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      bucket31_60Cents: sql<number>`coalesce(sum(case when cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer) between 31 and 60 then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      bucket61_90Cents: sql<number>`coalesce(sum(case when cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer) between 61 and 90 then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      bucket90PlusCents: sql<number>`coalesce(sum(case when cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer) > 90 then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
    })
    .from(receivablesTable)
    .where(
      and(
        gt(receivablesTable.currentBalanceCents, 0),
        sql`date(${receivablesTable.firstDueDate}) < date('now')`,
        scope.filterQuery(receivablesTable.distributorId)
      )
    );

  return (
    row ?? {
      bucket0_30Cents: 0,
      bucket31_60Cents: 0,
      bucket61_90Cents: 0,
      bucket90PlusCents: 0,
    }
  );
}

export type TrendRange = "7d" | "30d" | "90d";

const TREND_DAYS: Record<TrendRange, number> = {
  "30d": 30,
  "7d": 7,
  "90d": 90,
};

export async function getCollectionTrend(user: User, range: TrendRange) {
  const scope = Scope.forUser(user);
  const days = TREND_DAYS[range];

  const sinceClause = `-${days - 1} days`;
  const rows = await db
    .select({
      collectedCents: sql<number>`coalesce(sum(${paymentsTable.amountCents}), 0)`,
      date: sql<string>`date(${paymentsTable.paymentDate})`,
    })
    .from(paymentsTable)
    .innerJoin(
      receivablesTable,
      eq(paymentsTable.receivableId, receivablesTable.id)
    )
    .where(
      and(
        isNull(paymentsTable.voidedAt),
        sql`date(${paymentsTable.paymentDate}) >= date('now', ${sinceClause})`,
        scope.filterQuery(receivablesTable.distributorId)
      )
    )
    .groupBy(sql`date(${paymentsTable.paymentDate})`)
    .orderBy(sql`date(${paymentsTable.paymentDate})`);

  const byDate = new Map(rows.map((r) => [r.date, r.collectedCents]));
  const [today] = new Date().toISOString().split("T");
  const base = new Date(today);
  const out: { date: string; collectedCents: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const [iso] = d.toISOString().split("T");
    out.push({ collectedCents: byDate.get(iso) ?? 0, date: iso });
  }
  return out;
}

const TODAY_RECENT_VISITS_LIMIT = 8;
const TODAY_DUE_TODAY_LIMIT = 200;
const TODAY_TOP_OVERDUE_LIMIT = 5;

export async function getToday(user: User) {
  const scope = Scope.forUser(user);

  const [overdueAgg, openPromisesAgg, recentVisits, dueTodayRows, topOverdue] =
    await Promise.all([
      db
        .select({
          cents: sql<number>`coalesce(sum(case when ${receivablesTable.currentBalanceCents} > 0 and date(${receivablesTable.firstDueDate}) < date('now') then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
          count: sql<number>`coalesce(sum(case when ${receivablesTable.currentBalanceCents} > 0 and date(${receivablesTable.firstDueDate}) < date('now') then 1 else 0 end), 0)`,
        })
        .from(receivablesTable)
        .where(scope.filterQuery(receivablesTable.distributorId)),

      db
        .select({ count: count(visitsTable.id) })
        .from(visitsTable)
        .where(
          and(
            eq(visitsTable.outcome, "promised"),
            isNull(visitsTable.promiseResolvedAt),
            scope.filterQuery(visitsTable.distributorId)
          )
        ),

      db
        .select({
          createdAt: visitsTable.createdAt,
          customerId: visitsTable.customerId,
          customerName: customersTable.fullName,
          id: visitsTable.id,
          outcome: visitsTable.outcome,
          phone: customersTable.phone,
          type: visitsTable.type,
        })
        .from(visitsTable)
        .innerJoin(
          customersTable,
          eq(visitsTable.customerId, customersTable.id)
        )
        .where(
          and(
            sql`${visitsTable.createdAt} >= (unixepoch('now', '-1 day') * 1000)`,
            scope.filterQuery(visitsTable.distributorId)
          )
        )
        .orderBy(desc(visitsTable.createdAt))
        .limit(TODAY_RECENT_VISITS_LIMIT),

      db
        .select({
          customerId: customersTable.id,
          customerName: customersTable.fullName,
          dueAmountCents: paymentSchedulesTable.dueAmountCents,
          id: paymentSchedulesTable.id,
          installmentNo: paymentSchedulesTable.installmentNo,
          latitude: customersTable.latitude,
          longitude: customersTable.longitude,
          paidAmountCents: paymentSchedulesTable.paidAmountCents,
          phone: customersTable.phone,
          receivableId: paymentSchedulesTable.receivableId,
        })
        .from(paymentSchedulesTable)
        .innerJoin(
          receivablesTable,
          eq(paymentSchedulesTable.receivableId, receivablesTable.id)
        )
        .innerJoin(
          customersTable,
          eq(receivablesTable.customerId, customersTable.id)
        )
        .where(
          and(
            inArray(paymentSchedulesTable.status, ["pending", "partial"]),
            sql`date(${paymentSchedulesTable.dueDate}) = date('now')`,
            scope.filterQuery(receivablesTable.distributorId)
          )
        )
        .orderBy(customersTable.fullName)
        .limit(TODAY_DUE_TODAY_LIMIT),

      db
        .select({
          currentBalanceCents: receivablesTable.currentBalanceCents,
          customerId: customersTable.id,
          customerName: customersTable.fullName,
          daysOverdue: sql<number>`cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer)`,
          firstDueDate: receivablesTable.firstDueDate,
          id: receivablesTable.id,
          latitude: customersTable.latitude,
          longitude: customersTable.longitude,
          phone: customersTable.phone,
        })
        .from(receivablesTable)
        .innerJoin(
          customersTable,
          eq(receivablesTable.customerId, customersTable.id)
        )
        .where(
          and(
            gt(receivablesTable.currentBalanceCents, 0),
            sql`date(${receivablesTable.firstDueDate}) < date('now')`,
            scope.filterQuery(receivablesTable.distributorId)
          )
        )
        .orderBy(receivablesTable.firstDueDate)
        .limit(TODAY_TOP_OVERDUE_LIMIT),
    ]);

  const dueTodayAmountCents = dueTodayRows.reduce(
    (sum, row) => sum + (row.dueAmountCents - row.paidAmountCents),
    0
  );

  return {
    dueToday: dueTodayRows,
    dueTodayAmountCents,
    dueTodayCount: dueTodayRows.length,
    openPromisesCount: openPromisesAgg[0]?.count ?? 0,
    overdueAmountCents: overdueAgg[0]?.cents ?? 0,
    overdueCount: overdueAgg[0]?.count ?? 0,
    recentVisits,
    topOverdue,
  };
}
