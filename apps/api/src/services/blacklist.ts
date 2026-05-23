import {
  blacklistRequests as blacklistRequestsTable,
  customers as customersTable,
  db,
  distributors as distributorsTable,
} from "db";
import { and, desc, eq } from "drizzle-orm";
import type { BlacklistRequestInsert, BlacklistReview } from "schema";

import { badRequest, notFound } from "../lib/http";
import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";
import { logEvent } from "./audit";

export function createBlacklistRequest(
  actor: User,
  data: BlacklistRequestInsert
) {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, data.customerId));

    if (!customer) {
      throw notFound("Customer not found");
    }
    Scope.forUser(actor).assertCanRead(customer.distributorId);

    if (customer.riskStatus === "blacklisted") {
      throw badRequest("Customer is already blacklisted");
    }

    const [pending] = await tx
      .select()
      .from(blacklistRequestsTable)
      .where(
        and(
          eq(blacklistRequestsTable.customerId, data.customerId),
          eq(blacklistRequestsTable.status, "pending")
        )
      );

    if (pending) {
      throw badRequest(
        "A pending blacklist request already exists for this customer"
      );
    }

    const [inserted] = await tx
      .insert(blacklistRequestsTable)
      .values({
        customerId: data.customerId,
        distributorId: customer.distributorId,
        reason: data.reason,
        requestedByUserId: actor.id,
      })
      .returning();

    await logEvent(tx, {
      actorId: actor.id,
      distributorId: customer.distributorId,
      entityId: String(inserted.id),
      entityType: "blacklist_request",
      event: "blacklist.requested",
      metadata: {
        customerId: data.customerId,
        reason: data.reason,
      },
    });

    return inserted;
  });
}

export function listBlacklistRequests(actor: User, limit = 500) {
  return db
    .select({
      createdAt: blacklistRequestsTable.createdAt,
      customerFullName: customersTable.fullName,
      customerId: blacklistRequestsTable.customerId,
      distributorId: blacklistRequestsTable.distributorId,
      distributorName: distributorsTable.name,
      id: blacklistRequestsTable.id,
      reason: blacklistRequestsTable.reason,
      requestedByUserId: blacklistRequestsTable.requestedByUserId,
      reviewNote: blacklistRequestsTable.reviewNote,
      reviewedAt: blacklistRequestsTable.reviewedAt,
      reviewedByUserId: blacklistRequestsTable.reviewedByUserId,
      status: blacklistRequestsTable.status,
    })
    .from(blacklistRequestsTable)
    .innerJoin(
      customersTable,
      eq(blacklistRequestsTable.customerId, customersTable.id)
    )
    .innerJoin(
      distributorsTable,
      eq(blacklistRequestsTable.distributorId, distributorsTable.id)
    )
    .where(
      Scope.forUser(actor).filterQuery(blacklistRequestsTable.distributorId)
    )
    .orderBy(desc(blacklistRequestsTable.createdAt))
    .limit(limit);
}

export function reviewBlacklistRequest(
  actor: User,
  requestId: number,
  data: BlacklistReview
) {
  Scope.forUser(actor).assertAdmin();
  const { action, reviewNote } = data;

  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(blacklistRequestsTable)
      .where(eq(blacklistRequestsTable.id, requestId));

    if (!request) {
      throw notFound("Blacklist request not found");
    }
    if (request.status !== "pending") {
      throw badRequest("Request is no longer pending");
    }

    const [updated] = await tx
      .update(blacklistRequestsTable)
      .set({
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
        reviewedByUserId: actor.id,
        status: action === "approve" ? "approved" : "rejected",
      })
      .where(eq(blacklistRequestsTable.id, requestId))
      .returning();

    if (action === "approve") {
      await tx
        .update(customersTable)
        .set({ riskStatus: "blacklisted" })
        .where(eq(customersTable.id, request.customerId));
    }

    await logEvent(tx, {
      actorId: actor.id,
      distributorId: request.distributorId,
      entityId: String(requestId),
      entityType: "blacklist_request",
      event: action === "approve" ? "blacklist.approved" : "blacklist.rejected",
      metadata: {
        customerId: request.customerId,
        reason: request.reason,
        reviewNote: reviewNote ?? null,
      },
    });

    return updated;
  });
}
