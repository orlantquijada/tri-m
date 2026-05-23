import { zValidator } from "@hono/zod-validator";
import { userRoleEnum } from "schema";
import { z } from "zod";

import { createRouter } from "../lib/factory";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";
import {
  createDistributorUser,
  listAllUsers,
  listDistributorUsers,
  resetDistributorUserPassword,
  updateDistributorUser,
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
      return c.json(
        await updateDistributorUser(
          actor,
          c.req.param("id"),
          c.req.valid("json")
        )
      );
    }
  )
  .post(
    "/:id/reset-password",
    requireSession,
    zValidator("json", resetPasswordSchema),
    async (c) => {
      const actor = c.get("user");
      Scope.forUser(actor).assertAdmin();
      await resetDistributorUserPassword(
        actor,
        c.req.param("id"),
        c.req.valid("json").newPassword
      );
      return c.body(null, 204);
    }
  );
