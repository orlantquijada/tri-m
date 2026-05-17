import {
  customers as customersTable,
  db,
  receivables as receivablesTable,
} from "db";
import { eq, sql } from "drizzle-orm";
import {
  customerDetailSchema,
  customerListItemSchema,
  customerSelectSchema,
} from "schema";
import type { CustomerInsert, CustomerUpdate } from "schema";

import { isDistributorOwner } from "../lib/guards";
import { badRequest, forbidden, notFound } from "../lib/http";
import { distributorScope } from "../lib/scope";
import type { User } from "../middleware/auth";

export async function listCustomers(user: User) {
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
    .where(distributorScope(user, customersTable.distributorId))
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
  if (!isDistributorOwner(user, customer.distributorId)) {
    throw forbidden();
  }

  return customerDetailSchema.parse({ ...customer, receivables });
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

export async function updateCustomer(
  user: User,
  id: number,
  data: CustomerUpdate
) {
  const [existing] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, id));

  if (!existing) {
    throw notFound("Customer not found");
  }
  if (!isDistributorOwner(user, existing.distributorId)) {
    throw forbidden();
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

  return customerSelectSchema.parse(updated);
}
