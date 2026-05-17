import { db, distributors as distributorsTable, user } from "db";
import { eq } from "drizzle-orm";
import { userListItemSchema } from "schema";

import { auth } from "../lib/auth";
import { badRequest, notFound } from "../lib/http";

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

type UpdateUserInput = {
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

export async function updateUser(id: string, updates: UpdateUserInput) {
  const [updated] = await db
    .update(user)
    .set(updates)
    .where(eq(user.id, id))
    .returning(userFields);

  if (!updated) {
    throw notFound("User not found");
  }

  return updated;
}
