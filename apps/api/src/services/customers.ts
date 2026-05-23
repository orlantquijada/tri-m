import {
  customers as customersTable,
  db,
  distributors as distributorsTable,
  paymentSchedules as paymentSchedulesTable,
  receivables as receivablesTable,
} from "db";
import { and, eq, exists, inArray, ne, or, sql } from "drizzle-orm";
import {
  customerDetailSchema,
  customerListItemSchema,
  customerSelectSchema,
} from "schema";
import type { CustomerInsert, CustomerUpdate, RiskStatus } from "schema";

import { badRequest, forbidden, notFound } from "../lib/http";
import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";
import { logEvent } from "./audit";

export type ListCustomersFilters = {
  hasOverdue?: boolean;
  riskStatus?: RiskStatus[];
};

export async function listCustomers(
  user: User,
  filters: ListCustomersFilters = {}
) {
  const scope = Scope.forUser(user);
  const conditions = [scope.filterQuery(customersTable.distributorId)];

  if (filters.riskStatus && filters.riskStatus.length > 0) {
    conditions.push(inArray(customersTable.riskStatus, filters.riskStatus));
  }

  if (filters.hasOverdue) {
    conditions.push(
      exists(
        db
          .select({ id: receivablesTable.id })
          .from(receivablesTable)
          .where(
            and(
              eq(receivablesTable.customerId, customersTable.id),
              ne(receivablesTable.status, "fully_paid"),
              or(
                sql`date(${receivablesTable.firstDueDate}) < date('now')`,
                exists(
                  db
                    .select({ id: paymentSchedulesTable.id })
                    .from(paymentSchedulesTable)
                    .where(
                      and(
                        eq(
                          paymentSchedulesTable.receivableId,
                          receivablesTable.id
                        ),
                        inArray(paymentSchedulesTable.status, [
                          "pending",
                          "partial",
                        ]),
                        sql`date(${paymentSchedulesTable.dueDate}) < date('now')`
                      )
                    )
                )
              )
            )
          )
      )
    );
  }

  const rows = await db
    .select({
      address: customersTable.address,
      distributorId: customersTable.distributorId,
      fullName: customersTable.fullName,
      id: customersTable.id,
      latitude: customersTable.latitude,
      longitude: customersTable.longitude,
      notes: customersTable.notes,
      outstandingBalanceCents: sql<number>`coalesce(sum(${receivablesTable.currentBalanceCents}), 0)`,
      phone: customersTable.phone,
      riskStatus: customersTable.riskStatus,
    })
    .from(customersTable)
    .leftJoin(
      receivablesTable,
      eq(receivablesTable.customerId, customersTable.id)
    )
    .where(and(...conditions))
    .groupBy(customersTable.id);

  return customerListItemSchema.array().parse(rows);
}

export async function getCustomer(user: User, id: number) {
  const [[customer], receivables] = await Promise.all([
    db.select().from(customersTable).where(eq(customersTable.id, id)),
    db
      .select({
        currentBalanceCents: receivablesTable.currentBalanceCents,
        firstDueDate: receivablesTable.firstDueDate,
        id: receivablesTable.id,
        originalBalanceCents: receivablesTable.originalBalanceCents,
        productDescription: receivablesTable.productDescription,
        saleDate: receivablesTable.saleDate,
        status: receivablesTable.status,
      })
      .from(receivablesTable)
      .where(eq(receivablesTable.customerId, id)),
  ]);

  if (!customer) {
    throw notFound("Customer not found");
  }
  Scope.forUser(user).assertCanRead(customer.distributorId);

  return customerDetailSchema.parse({ ...customer, receivables });
}

export function listCustomersForExport(user: User, limit = 10_000) {
  return db
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
    .where(Scope.forUser(user).filterQuery(customersTable.distributorId))
    .limit(limit);
}

export function lookupCustomersByPhone(user: User, phone: string) {
  return db
    .select({
      distributorId: customersTable.distributorId,
      fullName: customersTable.fullName,
      id: customersTable.id,
    })
    .from(customersTable)
    .where(
      and(
        eq(customersTable.phone, phone),
        Scope.forUser(user).filterQuery(customersTable.distributorId)
      )
    );
}

export async function createCustomer(user: User, data: CustomerInsert) {
  let distributorId: number;
  if (user.role === "distributor") {
    if (!user.distributorId) {
      throw forbidden("No distributor assigned");
    }
    ({ distributorId } = user);
  } else {
    if (!data.distributorId) {
      throw badRequest("distributorId is required");
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

  return customerSelectSchema.parse(customer);
}

export function updateCustomer(user: User, id: number, data: CustomerUpdate) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, id));

    if (!existing) {
      throw notFound("Customer not found");
    }
    Scope.forUser(user).assertCanWrite(existing.distributorId);

    const [updated] = await tx
      .update(customersTable)
      .set({
        ...data,
        latitude: data.latitude ?? existing.latitude,
        longitude: data.longitude ?? existing.longitude,
        notes: data.notes ?? existing.notes,
      })
      .where(eq(customersTable.id, id))
      .returning();

    if (!updated) {
      throw notFound("Customer not found");
    }

    if (data.riskStatus && data.riskStatus !== existing.riskStatus) {
      await logEvent(tx, {
        actorId: user.id,
        distributorId: existing.distributorId,
        entityId: String(id),
        entityType: "customer",
        event: "customer.status_changed",
        metadata: {
          newStatus: data.riskStatus,
          previousStatus: existing.riskStatus,
        },
      });
    }

    return customerSelectSchema.parse(updated);
  });
}
