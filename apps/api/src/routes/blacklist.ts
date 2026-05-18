import { zValidator } from "@hono/zod-validator";
import {
  blacklistRequests as blacklistRequestsTable,
  customers as customersTable,
  db,
  distributors as distributorsTable,
} from "db";
import { and, eq } from "drizzle-orm";
import { blacklistRequestInsertSchema, blacklistReviewSchema } from "schema";

import { createRouter } from "../lib/factory";
import { badRequest, notFound } from "../lib/http";
import { idParam } from "../lib/params";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";

export const blacklistRequests = createRouter()
  .post(
    "/",
    requireSession,
    zValidator("json", blacklistRequestInsertSchema),
    async (c) => {
      const user = c.get("user");
      const data = c.req.valid("json");

      const [customer] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, data.customerId));

      if (!customer) {
        throw notFound("Customer not found");
      }
      Scope.forUser(user).assertCanRead(customer.distributorId);

      if (customer.riskStatus === "blacklisted") {
        throw badRequest("Customer is already blacklisted");
      }

      const [pending] = await db
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

      const [request] = await db
        .insert(blacklistRequestsTable)
        .values({
          customerId: data.customerId,
          distributorId: customer.distributorId,
          reason: data.reason,
          requestedByUserId: user.id,
        })
        .returning();

      if (!request) {
        throw new Error("Failed to insert blacklist request");
      }
      return c.json(request, 201);
    }
  )
  .get("/", requireSession, async (c) => {
    const user = c.get("user");

    const rows = await db
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
        Scope.forUser(user).filterQuery(blacklistRequestsTable.distributorId)
      );

    return c.json({ requests: rows });
  })
  .patch(
    "/:id",
    requireSession,
    zValidator("json", blacklistReviewSchema),
    async (c) => {
      const user = c.get("user");
      Scope.forUser(user).assertAdmin();

      const requestId = idParam(c);
      const { action, reviewNote } = c.req.valid("json");

      const [request] = await db
        .select()
        .from(blacklistRequestsTable)
        .where(eq(blacklistRequestsTable.id, requestId));

      if (!request) {
        throw notFound("Blacklist request not found");
      }
      if (request.status !== "pending") {
        throw badRequest("Request is no longer pending");
      }

      return c.json(
        await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(blacklistRequestsTable)
            .set({
              reviewNote: reviewNote ?? null,
              reviewedAt: new Date(),
              reviewedByUserId: user.id,
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

          if (!updated) {
            throw new Error("Failed to update blacklist request");
          }
          return updated;
        })
      );
    }
  );
