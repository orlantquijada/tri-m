import {
  customers as customersTable,
  db,
  distributors as distributorsTable,
  receivables as receivablesTable,
} from "db";
import { eq, sql } from "drizzle-orm";
import {
  distributorInsertSchema,
  distributorListItemSchema,
  distributorSelectSchema,
} from "schema";
import type { DistributorInsert, DistributorUpdate } from "schema";

import { notFound } from "../lib/http";

export async function listDistributors() {
  const rows = await db
    .select({
      assignedArea: distributorsTable.assignedArea,
      createdAt: distributorsTable.createdAt,
      customerCount: sql<number>`count(distinct ${customersTable.id})`.mapWith(
        Number
      ),
      id: distributorsTable.id,
      name: distributorsTable.name,
      outstandingCents:
        sql<number>`coalesce(sum(${receivablesTable.currentBalanceCents}), 0)`.mapWith(
          Number
        ),
      phone: distributorsTable.phone,
      status: distributorsTable.status,
      updatedAt: distributorsTable.updatedAt,
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

  return distributorListItemSchema.array().parse(rows);
}

export async function getDistributor(id: number) {
  const [row] = await db
    .select()
    .from(distributorsTable)
    .where(eq(distributorsTable.id, id));
  if (!row) {
    throw notFound("Distributor not found");
  }
  return distributorSelectSchema.parse(row);
}

export async function createDistributor(data: DistributorInsert) {
  const parsed = distributorInsertSchema.parse(data);
  const [row] = await db
    .insert(distributorsTable)
    .values({
      assignedArea: parsed.assignedArea ?? null,
      name: parsed.name,
      phone: parsed.phone,
      status: parsed.status,
    })
    .returning();
  return distributorSelectSchema.parse(row);
}

export async function updateDistributor(id: number, data: DistributorUpdate) {
  const [existing] = await db
    .select()
    .from(distributorsTable)
    .where(eq(distributorsTable.id, id));
  if (!existing) {
    throw notFound("Distributor not found");
  }
  const [updated] = await db
    .update(distributorsTable)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.status !== undefined && { status: data.status }),
      assignedArea:
        data.assignedArea !== undefined
          ? data.assignedArea
          : existing.assignedArea,
    })
    .where(eq(distributorsTable.id, id))
    .returning();
  return distributorSelectSchema.parse(updated);
}
