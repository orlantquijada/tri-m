import { hashPassword } from "better-auth/crypto";
import { account, db, distributors as distributorsTable, user } from "db";
import { and, eq } from "drizzle-orm";
import { userListItemSchema } from "schema";

import { auth } from "../lib/auth";
import { badRequest, forbidden, notFound } from "../lib/http";
import type { User } from "../middleware/auth";
import { logEvent } from "./audit";

export const userFields = {
  distributorId: user.distributorId,
  email: user.email,
  id: user.id,
  name: user.name,
  role: user.role,
};

type CreateDistributorUserInput = {
  distributorId: number;
  email: string;
  name: string;
  password: string;
};

type UpdateDistributorUserInput = {
  distributorId?: number;
  role?: "admin" | "distributor";
};

// oxlint-disable-next-line require-await
export async function listDistributorUsers() {
  return db.select(userFields).from(user).where(eq(user.role, "distributor"));
}

export async function listAllUsers() {
  const rows = await db
    .select({
      createdAt: user.createdAt,
      distributorId: user.distributorId,
      distributorName: distributorsTable.name,
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
    })
    .from(user)
    .leftJoin(distributorsTable, eq(distributorsTable.id, user.distributorId));

  return userListItemSchema.array().parse(rows);
}

export async function createDistributorUser(input: CreateDistributorUserInput) {
  const { distributorId, email, name, password } = input;

  const result = await auth.api.signUpEmail({
    body: { email, name, password },
  });
  if (!result.user) {
    throw badRequest("Failed to create user");
  }

  const [created] = await db
    .update(user)
    .set({ distributorId, role: "distributor" })
    .where(eq(user.id, result.user.id))
    .returning(userFields);

  return created;
}

export function updateDistributorUser(
  actor: User,
  targetId: string,
  updates: UpdateDistributorUserInput
) {
  if (Object.keys(updates).length === 0) {
    throw badRequest("No fields to update");
  }

  return db.transaction(async (tx) => {
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
}

export async function resetDistributorUserPassword(
  actor: User,
  targetId: string,
  newPassword: string
) {
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
        and(eq(account.userId, targetId), eq(account.providerId, "credential"))
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
}
