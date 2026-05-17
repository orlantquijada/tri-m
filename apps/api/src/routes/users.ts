import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { createRouter } from "../lib/factory";
import { badRequest } from "../lib/http";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";
import {
  createDistributorUser,
  listDistributorUsers,
  updateUser,
} from "../services/users";

const createDistributorUserSchema = z.object({
  distributorId: z.number().int().positive(),
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

const updateDistributorUserSchema = z.object({
  distributorId: z.number().int().positive().optional(),
  role: z.enum(["admin", "distributor"]).optional(),
});

export const users = createRouter()
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
      Scope.forUser(c.get("user")).assertAdmin();
      const updates = c.req.valid("json");

      if (!Object.keys(updates).length) {
        throw badRequest("No fields to update");
      }

      return c.json(await updateUser(c.req.param("id"), updates));
    }
  );
