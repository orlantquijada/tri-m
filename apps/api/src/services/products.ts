import {
  db,
  distributors as distributorsTable,
  products as productsTable,
  stockMovements as stockMovementsTable,
} from "db";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { productListItemSchema, productSelectSchema } from "schema";
import type {
  ProductInsert,
  ProductQuery,
  ProductUpdate,
  StockLevel,
  StockLevelsQuery,
} from "schema";

import { badRequest, forbidden, notFound } from "../lib/http";
import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";
import { logEvent } from "./audit";

function conflict(message: string) {
  return new HTTPException(409, { message });
}

function resolveDistributorId(user: User, requested?: string): string {
  if (user.role === "distributor") {
    if (!user.distributorId) {
      throw forbidden("No distributor assigned");
    }
    if (requested && requested !== user.distributorId) {
      throw forbidden();
    }
    return user.distributorId;
  }
  if (!requested) {
    throw badRequest("distributorId is required");
  }
  return requested;
}

export async function listProducts(user: User, filters: ProductQuery = {}) {
  const scope = Scope.forUser(user);
  const conditions: (SQL | undefined)[] = [
    scope.filterQuery(productsTable.distributorId),
  ];

  if (user.role === "admin" && filters.distributorId) {
    conditions.push(eq(productsTable.distributorId, filters.distributorId));
  }
  if (filters.status) {
    conditions.push(eq(productsTable.status, filters.status));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(like(productsTable.name, term), like(productsTable.sku, term))
    );
  }

  const rows = await db
    .select({
      createdAt: productsTable.createdAt,
      currentQty: productsTable.id, // placeholder, overwritten below
      description: productsTable.description,
      distributorId: productsTable.distributorId,
      distributorName: distributorsTable.name,
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      status: productsTable.status,
      unitPriceCents: productsTable.unitPriceCents,
      updatedAt: productsTable.updatedAt,
    })
    .from(productsTable)
    .leftJoin(
      distributorsTable,
      eq(productsTable.distributorId, distributorsTable.id)
    )
    .where(and(...conditions.filter((c): c is SQL => c !== undefined)))
    .orderBy(desc(productsTable.createdAt));

  return productListItemSchema
    .array()
    .parse(rows.map((r) => ({ ...r, currentQty: 0 })));
}

export async function listStockLevels(
  user: User,
  filters: StockLevelsQuery = {}
): Promise<StockLevel[]> {
  const scope = Scope.forUser(user);
  const conditions: SQL[] = [];
  const scopeFilter = scope.filterQuery(productsTable.distributorId);
  if (scopeFilter) {
    conditions.push(scopeFilter);
  }
  if (user.role === "admin" && filters.distributorId) {
    conditions.push(eq(productsTable.distributorId, filters.distributorId));
  }
  if (filters.productId) {
    conditions.push(eq(productsTable.id, filters.productId));
  }

  return db
    .select({
      currentQty:
        sql<number>`coalesce(sum(${stockMovementsTable.qty}), 0)`.mapWith(
          Number
        ),
      distributorId: productsTable.distributorId,
      productId: productsTable.id,
    })
    .from(productsTable)
    .leftJoin(
      stockMovementsTable,
      and(
        eq(stockMovementsTable.productId, productsTable.id),
        eq(stockMovementsTable.distributorId, productsTable.distributorId),
        isNull(stockMovementsTable.voidedAt)
      )
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(productsTable.id, productsTable.distributorId);
}

export function listProductsForExport(
  user: User,
  opts: { distributorId?: string } = {},
  limit = 10_000
) {
  const scope = Scope.forUser(user);
  const conditions: SQL[] = [];
  const scopeFilter = scope.filterQuery(productsTable.distributorId);
  if (scopeFilter) {
    conditions.push(scopeFilter);
  }
  if (user.role === "admin" && opts.distributorId) {
    conditions.push(eq(productsTable.distributorId, opts.distributorId));
  }

  return db
    .select({
      createdAt: productsTable.createdAt,
      currentQty:
        sql<number>`coalesce(sum(${stockMovementsTable.qty}), 0)`.mapWith(
          Number
        ),
      description: productsTable.description,
      distributorId: productsTable.distributorId,
      distributorName: distributorsTable.name,
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      status: productsTable.status,
      unitPriceCents: productsTable.unitPriceCents,
    })
    .from(productsTable)
    .innerJoin(
      distributorsTable,
      eq(productsTable.distributorId, distributorsTable.id)
    )
    .leftJoin(
      stockMovementsTable,
      and(
        eq(stockMovementsTable.productId, productsTable.id),
        eq(stockMovementsTable.distributorId, productsTable.distributorId),
        isNull(stockMovementsTable.voidedAt)
      )
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(productsTable.id, distributorsTable.name)
    .orderBy(desc(productsTable.id))
    .limit(limit);
}

export async function getProduct(user: User, id: string) {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id));
  if (!product) {
    throw notFound("Product not found");
  }
  Scope.forUser(user).assertCanRead(product.distributorId);
  return productSelectSchema.parse(product);
}

export function createProduct(user: User, data: ProductInsert) {
  const distributorId = resolveDistributorId(user, data.distributorId);
  Scope.forUser(user).assertCanWrite(distributorId);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.distributorId, distributorId),
          eq(productsTable.sku, data.sku)
        )
      );
    if (existing) {
      throw conflict("SKU already in use for this distributor");
    }

    const [product] = await tx
      .insert(productsTable)
      .values({
        description: data.description ?? null,
        distributorId,
        name: data.name,
        sku: data.sku,
        unitPriceCents: data.unitPriceCents ?? null,
      })
      .returning();

    if (!product) {
      throw new Error("Failed to insert product");
    }

    await logEvent(tx, {
      actorId: user.id,
      distributorId,
      entityId: product.id,
      entityType: "product",
      event: "product.created",
      metadata: { name: product.name, sku: product.sku },
    });

    return productSelectSchema.parse(product);
  });
}

export function updateProduct(user: User, id: string, data: ProductUpdate) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id));
    if (!existing) {
      throw notFound("Product not found");
    }
    Scope.forUser(user).assertCanWrite(existing.distributorId);

    const next = {
      description:
        data.description === undefined
          ? existing.description
          : (data.description ?? null),
      name: data.name ?? existing.name,
      unitPriceCents:
        data.unitPriceCents === undefined
          ? existing.unitPriceCents
          : (data.unitPriceCents ?? null),
    };

    const [updated] = await tx
      .update(productsTable)
      .set(next)
      .where(eq(productsTable.id, id))
      .returning();

    if (!updated) {
      throw notFound("Product not found");
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    if (next.name !== existing.name) {
      before.name = existing.name;
      after.name = next.name;
    }
    if (next.description !== existing.description) {
      before.description = existing.description;
      after.description = next.description;
    }
    if (next.unitPriceCents !== existing.unitPriceCents) {
      before.unitPriceCents = existing.unitPriceCents;
      after.unitPriceCents = next.unitPriceCents;
    }

    if (Object.keys(after).length > 0) {
      await logEvent(tx, {
        actorId: user.id,
        distributorId: existing.distributorId,
        entityId: id,
        entityType: "product",
        event: "product.updated",
        metadata: { after, before },
      });
    }

    return productSelectSchema.parse(updated);
  });
}

export function archiveProduct(user: User, id: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id));
    if (!existing) {
      throw notFound("Product not found");
    }
    Scope.forUser(user).assertCanWrite(existing.distributorId);

    if (existing.status === "archived") {
      return productSelectSchema.parse(existing);
    }

    const [updated] = await tx
      .update(productsTable)
      .set({ status: "archived" })
      .where(eq(productsTable.id, id))
      .returning();

    if (!updated) {
      throw notFound("Product not found");
    }

    await logEvent(tx, {
      actorId: user.id,
      distributorId: existing.distributorId,
      entityId: id,
      entityType: "product",
      event: "product.archived",
      metadata: { sku: existing.sku },
    });

    return productSelectSchema.parse(updated);
  });
}
