import {
  db,
  distributors as distributorsTable,
  products as productsTable,
  stockMovements as stockMovementsTable,
  user as userTable,
} from "db";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { stockMovementListItemSchema, stockMovementSelectSchema } from "schema";
import type {
  AuditEventType,
  RecordMovementInput,
  StockMovementQuery,
  StockMovementType,
} from "schema";

import { badRequest, notFound } from "../lib/http";
import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";
import { logEvent } from "./audit";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = Tx | typeof db;

const auditEventByType: Record<StockMovementType, AuditEventType> = {
  adjustment: "stock.adjusted",
  receive: "stock.received",
  sale: "stock.sold",
  transfer_in: "stock.transferred_in",
  transfer_out: "stock.transferred_out",
};

export function signQty(type: StockMovementType, qty: number): number {
  switch (type) {
    case "receive":
    case "transfer_in": {
      return Math.abs(qty);
    }
    case "sale":
    case "transfer_out": {
      return -Math.abs(qty);
    }
    case "adjustment": {
      return qty;
    }
  }
}

export async function getStockLevel(
  client: DbOrTx,
  productId: string,
  distributorId: string
): Promise<number> {
  const [row] = await client
    .select({
      qty: sql<number>`coalesce(sum(${stockMovementsTable.qty}), 0)`.mapWith(
        Number
      ),
    })
    .from(stockMovementsTable)
    .where(
      and(
        eq(stockMovementsTable.productId, productId),
        eq(stockMovementsTable.distributorId, distributorId),
        isNull(stockMovementsTable.voidedAt)
      )
    );
  return row?.qty ?? 0;
}

export function getStockLevels(
  client: DbOrTx,
  options: { distributorId?: string | null; productIds?: string[] } = {}
) {
  const conditions: SQL[] = [isNull(stockMovementsTable.voidedAt)];
  if (options.distributorId) {
    conditions.push(
      eq(stockMovementsTable.distributorId, options.distributorId)
    );
  }
  if (options.productIds && options.productIds.length > 0) {
    conditions.push(inArray(stockMovementsTable.productId, options.productIds));
  }

  return client
    .select({
      currentQty:
        sql<number>`coalesce(sum(${stockMovementsTable.qty}), 0)`.mapWith(
          Number
        ),
      distributorId: stockMovementsTable.distributorId,
      productId: stockMovementsTable.productId,
    })
    .from(stockMovementsTable)
    .where(and(...conditions))
    .groupBy(stockMovementsTable.productId, stockMovementsTable.distributorId);
}

export async function listMovements(user: User, filters: StockMovementQuery) {
  const scope = Scope.forUser(user);
  const conditions: SQL[] = [];

  const scopeFilter = scope.filterQuery(stockMovementsTable.distributorId);
  if (scopeFilter) {
    conditions.push(scopeFilter);
  }
  if (user.role === "admin" && filters.distributorId) {
    conditions.push(
      eq(stockMovementsTable.distributorId, filters.distributorId)
    );
  }
  if (filters.productId) {
    conditions.push(eq(stockMovementsTable.productId, filters.productId));
  }
  if (!filters.includeVoided) {
    conditions.push(isNull(stockMovementsTable.voidedAt));
  }
  if (filters.from) {
    conditions.push(gte(stockMovementsTable.createdAt, new Date(filters.from)));
  }
  if (filters.to) {
    conditions.push(lte(stockMovementsTable.createdAt, new Date(filters.to)));
  }

  const rows = await db
    .select({
      createdAt: stockMovementsTable.createdAt,
      distributorId: stockMovementsTable.distributorId,
      distributorName: distributorsTable.name,
      id: stockMovementsTable.id,
      productId: stockMovementsTable.productId,
      productName: productsTable.name,
      qty: stockMovementsTable.qty,
      reasonNote: stockMovementsTable.reasonNote,
      recordedByName: userTable.name,
      recordedByUserId: stockMovementsTable.recordedByUserId,
      referenceId: stockMovementsTable.referenceId,
      referenceType: stockMovementsTable.referenceType,
      sku: productsTable.sku,
      type: stockMovementsTable.type,
      voidReason: stockMovementsTable.voidReason,
      voidedAt: stockMovementsTable.voidedAt,
    })
    .from(stockMovementsTable)
    .leftJoin(
      productsTable,
      eq(stockMovementsTable.productId, productsTable.id)
    )
    .leftJoin(
      distributorsTable,
      eq(stockMovementsTable.distributorId, distributorsTable.id)
    )
    .leftJoin(userTable, eq(stockMovementsTable.recordedByUserId, userTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stockMovementsTable.createdAt))
    .limit(filters.limit);

  return stockMovementListItemSchema.array().parse(rows);
}

export function listMovementsForExport(
  user: User,
  filters: {
    distributorId?: string;
    from?: string;
    productId?: string;
    to?: string;
  } = {},
  limit = 10_000
) {
  const scope = Scope.forUser(user);
  const conditions: SQL[] = [];

  const scopeFilter = scope.filterQuery(stockMovementsTable.distributorId);
  if (scopeFilter) {
    conditions.push(scopeFilter);
  }
  if (user.role === "admin" && filters.distributorId) {
    conditions.push(
      eq(stockMovementsTable.distributorId, filters.distributorId)
    );
  }
  if (filters.productId) {
    conditions.push(eq(stockMovementsTable.productId, filters.productId));
  }
  if (filters.from) {
    conditions.push(gte(stockMovementsTable.createdAt, new Date(filters.from)));
  }
  if (filters.to) {
    conditions.push(lte(stockMovementsTable.createdAt, new Date(filters.to)));
  }

  return db
    .select({
      createdAt: stockMovementsTable.createdAt,
      distributorId: stockMovementsTable.distributorId,
      distributorName: distributorsTable.name,
      id: stockMovementsTable.id,
      productId: stockMovementsTable.productId,
      productName: productsTable.name,
      qty: stockMovementsTable.qty,
      reasonNote: stockMovementsTable.reasonNote,
      recordedByName: userTable.name,
      referenceId: stockMovementsTable.referenceId,
      referenceType: stockMovementsTable.referenceType,
      sku: productsTable.sku,
      type: stockMovementsTable.type,
      voidReason: stockMovementsTable.voidReason,
      voidedAt: stockMovementsTable.voidedAt,
    })
    .from(stockMovementsTable)
    .leftJoin(
      productsTable,
      eq(stockMovementsTable.productId, productsTable.id)
    )
    .leftJoin(
      distributorsTable,
      eq(stockMovementsTable.distributorId, distributorsTable.id)
    )
    .leftJoin(userTable, eq(stockMovementsTable.recordedByUserId, userTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stockMovementsTable.id))
    .limit(limit);
}

export function recordMovement(user: User, data: RecordMovementInput) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select({
        distributorId: productsTable.distributorId,
        id: productsTable.id,
        status: productsTable.status,
      })
      .from(productsTable)
      .where(eq(productsTable.id, data.productId));
    if (!product) {
      throw notFound("Product not found");
    }
    Scope.forUser(user).assertCanWrite(product.distributorId);
    if (product.status !== "active") {
      throw badRequest("Cannot record a movement on an archived product");
    }
    if (data.qty === 0) {
      throw badRequest("qty must be non-zero");
    }
    if (data.type !== "adjustment" && data.qty <= 0) {
      throw badRequest("qty must be a positive integer for this movement type");
    }

    const signedQty = signQty(data.type, data.qty);

    const [movement] = await tx
      .insert(stockMovementsTable)
      .values({
        distributorId: product.distributorId,
        productId: product.id,
        qty: signedQty,
        reasonNote: data.reasonNote ?? null,
        recordedByUserId: user.id,
        referenceId: data.referenceId ?? null,
        referenceType: data.referenceType ?? null,
        type: data.type,
      })
      .returning();

    if (!movement) {
      throw new Error("Failed to insert stock movement");
    }

    await logEvent(tx, {
      actorId: user.id,
      distributorId: product.distributorId,
      entityId: movement.id,
      entityType: "stock_movement",
      event: auditEventByType[data.type],
      metadata: {
        productId: product.id,
        qty: signedQty,
        type: data.type,
      },
    });

    return stockMovementSelectSchema.parse(movement);
  });
}

export function voidMovement(user: User, id: string, reason: string) {
  return db.transaction(async (tx) => {
    const [movement] = await tx
      .select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, id));
    if (!movement) {
      throw notFound("Stock movement not found");
    }
    Scope.forUser(user).assertCanWrite(movement.distributorId);

    if (movement.voidedAt) {
      return stockMovementSelectSchema.parse(movement);
    }

    const [updated] = await tx
      .update(stockMovementsTable)
      .set({ voidReason: reason, voidedAt: new Date() })
      .where(eq(stockMovementsTable.id, id))
      .returning();

    if (!updated) {
      throw notFound("Stock movement not found");
    }

    await logEvent(tx, {
      actorId: user.id,
      distributorId: movement.distributorId,
      entityId: id,
      entityType: "stock_movement",
      event: "stock.voided",
      metadata: {
        productId: movement.productId,
        qty: movement.qty,
        reason,
        type: movement.type,
      },
    });

    return stockMovementSelectSchema.parse(updated);
  });
}
