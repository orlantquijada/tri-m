import { zValidator } from "@hono/zod-validator";
import { distributorInsertSchema, distributorUpdateSchema } from "schema";

import { createRouter } from "../lib/factory";
import { idParam } from "../lib/params";
import { requireAdmin, requireSession } from "../middleware/auth";
import {
  createDistributor,
  getDistributor,
  listDistributors,
  updateDistributor,
} from "../services/distributors";

export const distributors = createRouter()
  .get("/", requireSession, async (c) => {
    requireAdmin(c.get("user"));
    return c.json(await listDistributors());
  })
  .get("/:id", requireSession, async (c) => {
    requireAdmin(c.get("user"));
    return c.json(await getDistributor(idParam(c)));
  })
  .post(
    "/",
    requireSession,
    zValidator("json", distributorInsertSchema),
    async (c) => {
      requireAdmin(c.get("user"));
      return c.json(await createDistributor(c.req.valid("json")), 201);
    }
  )
  .patch(
    "/:id",
    requireSession,
    zValidator("json", distributorUpdateSchema),
    async (c) => {
      requireAdmin(c.get("user"));
      return c.json(await updateDistributor(idParam(c), c.req.valid("json")));
    }
  );
