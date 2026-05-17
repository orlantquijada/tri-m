import {
  customers as customersTable,
  db,
  distributors as distributorsTable,
  receivables as receivablesTable,
} from "db";
import { eq, sql } from "drizzle-orm";
import { distributorListItemSchema } from "schema";

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
