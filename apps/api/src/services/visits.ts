import { customers as customersTable, db, visits as visitsTable } from "db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { visitSelectSchema } from "schema";
import type { VisitInsert, VisitListQuery } from "schema";

import { badRequest, notFound } from "../lib/http";
import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";

export async function listVisits(
  user: User,
  { customerId, limit, page }: VisitListQuery
) {
  const scope = Scope.forUser(user);
  const conditions = [scope.filterQuery(visitsTable.distributorId)];

  if (customerId) {
    conditions.push(eq(visitsTable.customerId, customerId));
  }

  const rows = await db
    .select()
    .from(visitsTable)
    .where(and(...conditions))
    .orderBy(desc(visitsTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return visitSelectSchema.array().parse(rows);
}

export async function createVisit(user: User, data: VisitInsert) {
  const [customer] = await db
    .select({
      distributorId: customersTable.distributorId,
      id: customersTable.id,
    })
    .from(customersTable)
    .where(eq(customersTable.id, data.customerId));

  if (!customer) {
    throw notFound("Customer not found");
  }
  Scope.forUser(user).assertCanWrite(customer.distributorId);

  const [visit] = await db
    .insert(visitsTable)
    .values({
      customerId: customer.id,
      distributorId: customer.distributorId,
      gpsLat: data.gpsLat ?? null,
      gpsLng: data.gpsLng ?? null,
      notes: data.notes ?? null,
      outcome: data.outcome,
      promisedAmountCents: data.promisedAmountCents ?? null,
      promisedDate: data.promisedDate ?? null,
      recordedByUserId: user.id,
      type: data.type,
    })
    .returning();

  if (!visit) {
    throw new Error("Failed to insert visit");
  }

  return visitSelectSchema.parse(visit);
}

export async function resolvePromise(user: User, visitId: number) {
  const [visit] = await db
    .select()
    .from(visitsTable)
    .where(eq(visitsTable.id, visitId));

  if (!visit) {
    throw notFound("Visit not found");
  }
  if (visit.outcome !== "promised") {
    throw badRequest("Visit is not a promise");
  }
  if (visit.promiseResolvedAt) {
    throw badRequest("Promise is already resolved");
  }
  Scope.forUser(user).assertCanWrite(visit.distributorId);

  const [updated] = await db
    .update(visitsTable)
    .set({ promiseResolvedAt: new Date() })
    .where(eq(visitsTable.id, visitId))
    .returning();

  if (!updated) {
    throw notFound("Visit not found");
  }

  return visitSelectSchema.parse(updated);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntilDueLocal(promisedDate: string): number {
  const [year, month, day] = promisedDate.split("-").map(Number);
  if (!year || !month || !day) {
    return 0;
  }
  const due = new Date(year, month - 1, day);
  const today = startOfLocalDay(new Date());
  return Math.round((due.getTime() - today.getTime()) / DAY_MS);
}

export async function listOpenPromises(user: User) {
  const scope = Scope.forUser(user);
  const rows = await db
    .select({
      createdAt: visitsTable.createdAt,
      customer: {
        address: customersTable.address,
        fullName: customersTable.fullName,
        id: customersTable.id,
        phone: customersTable.phone,
      },
      customerId: visitsTable.customerId,
      distributorId: visitsTable.distributorId,
      gpsLat: visitsTable.gpsLat,
      gpsLng: visitsTable.gpsLng,
      id: visitsTable.id,
      notes: visitsTable.notes,
      outcome: visitsTable.outcome,
      promiseResolvedAt: visitsTable.promiseResolvedAt,
      promisedAmountCents: visitsTable.promisedAmountCents,
      promisedDate: visitsTable.promisedDate,
      recordedByUserId: visitsTable.recordedByUserId,
      type: visitsTable.type,
    })
    .from(visitsTable)
    .innerJoin(customersTable, eq(visitsTable.customerId, customersTable.id))
    .where(
      and(
        scope.filterQuery(visitsTable.distributorId),
        eq(visitsTable.outcome, "promised"),
        isNull(visitsTable.promiseResolvedAt)
      )
    )
    .orderBy(visitsTable.promisedDate);

  return rows.map((row) => {
    const visit = visitSelectSchema.parse({
      createdAt: row.createdAt,
      customerId: row.customerId,
      distributorId: row.distributorId,
      gpsLat: row.gpsLat,
      gpsLng: row.gpsLng,
      id: row.id,
      notes: row.notes,
      outcome: row.outcome,
      promiseResolvedAt: row.promiseResolvedAt,
      promisedAmountCents: row.promisedAmountCents,
      promisedDate: row.promisedDate,
      recordedByUserId: row.recordedByUserId,
      type: row.type,
    });
    return {
      ...visit,
      customer: row.customer,
      daysUntilDue: row.promisedDate ? daysUntilDueLocal(row.promisedDate) : 0,
    };
  });
}
