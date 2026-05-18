import { zValidator } from "@hono/zod-validator";
import { hashPassword } from "better-auth/crypto";
import { account, db, user } from "db";
import { and, eq } from "drizzle-orm";
import { userRoleEnum } from "schema";
import { z } from "zod";

import { createRouter } from "../lib/factory";
import { badRequest, forbidden, notFound } from "../lib/http";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";
import { logEvent } from "../services/audit";
import {
  createDistributorUser,
  listAllUsers,
  listDistributorUsers,
  userFields,
} from "../services/users";

const createDistributorUserSchema = z.object({
  distributorId: z.number().int().positive(),
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

const updateDistributorUserSchema = z.object({
  distributorId: z.number().int().positive().optional(),
  role: userRoleEnum.optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export const users = createRouter()
  .get("/", requireSession, async (c) => {
    Scope.forUser(c.get("user")).assertAdmin();
    return c.json(await listAllUsers());
  })
  .get("/distributor-users", requireSession, async (c) => {
    Scope.forUser(c.get("user")).assertAdmin();
    return c.json(await listDistributorUsers());
  })
  .post(
    "/distributor-users",
    requireSession,
    zValidator("json", createDistributorUserSchema),
    async (c) => {
      Scope.forUser(c.get("user")).assertAdmin();
      return c.json(await createDistributorUser(c.req.valid("json")), 201);
    }
  )
  .patch(
    "/:id",
    requireSession,
    zValidator("json", updateDistributorUserSchema),
    async (c) => {
      const actor = c.get("user");
      Scope.forUser(actor).assertAdmin();
      const updates = c.req.valid("json");

      if (!Object.keys(updates).length) {
        throw badRequest("No fields to update");
      }

      const targetId = c.req.param("id");
      const updated = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ distributorId: user.distributorId })
          .from(user)
          .where(eq(user.id, targetId));

        if (!existing) {
          throw notFound("User not found");
        }

        const [next] = await tx
          .update(user)
          .set(updates)
          .where(eq(user.id, targetId))
          .returning(userFields);

        if (!next) {
          throw notFound("User not found");
        }

        if (
          updates.distributorId !== undefined &&
          updates.distributorId !== existing.distributorId
        ) {
          await logEvent(tx, {
            actorId: actor.id,
            distributorId: updates.distributorId,
            entityId: targetId,
            entityType: "user",
            event: "user.distributor_assigned",
            metadata: {
              newDistributorId: updates.distributorId,
              previousDistributorId: existing.distributorId,
              targetUserId: targetId,
            },
          });
        }

        return next;
      });

      return c.json(updated);
    }
  )
  .post(
    "/:id/reset-password",
    requireSession,
    zValidator("json", resetPasswordSchema),
    async (c) => {
      const actor = c.get("user");
      Scope.forUser(actor).assertAdmin();
      const targetId = c.req.param("id");
      const { newPassword } = c.req.valid("json");

      const [target] = await db
        .select({ distributorId: user.distributorId, role: user.role })
        .from(user)
        .where(eq(user.id, targetId));

      if (!target) {
        throw notFound("User not found");
      }
      if (target.role !== "distributor") {
        throw forbidden("Only distributor passwords can be reset");
      }

      const hash = await hashPassword(newPassword);
      await db.transaction(async (tx) => {
        const updated = await tx
          .update(account)
          .set({ password: hash })
          .where(
            and(
              eq(account.userId, targetId),
              eq(account.providerId, "credential")
            )
          )
          .returning({ id: account.id });

        if (updated.length === 0) {
          throw notFound("No credential account for user");
        }

        await logEvent(tx, {
          actorId: actor.id,
          distributorId: target.distributorId,
          entityId: targetId,
          entityType: "user",
          event: "user.password_reset",
          metadata: { targetUserId: targetId },
        });
      });

      return c.body(null, 204);
    }
  );
