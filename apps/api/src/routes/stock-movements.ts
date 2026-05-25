import { zValidator } from "@hono/zod-validator";
import {
  recordMovementSchema,
  stockMovementQuerySchema,
  voidMovementSchema,
} from "schema";

import { createRouter } from "../lib/factory";
import { idParam } from "../lib/params";
import { requireSession } from "../middleware/auth";
import { listMovements, recordMovement, voidMovement } from "../services/stock";

export const stockMovements = createRouter()
  .get(
    "/",
    requireSession,
    zValidator("query", stockMovementQuerySchema),
    async (c) =>
      c.json(await listMovements(c.get("user"), c.req.valid("query")))
  )
  .post(
    "/",
    requireSession,
    zValidator("json", recordMovementSchema),
    async (c) =>
      c.json(await recordMovement(c.get("user"), c.req.valid("json")), 201)
  )
  .post(
    "/:id/void",
    requireSession,
    zValidator("json", voidMovementSchema),
    async (c) =>
      c.json(
        await voidMovement(
          c.get("user"),
          idParam(c),
          c.req.valid("json").reason
        )
      )
  );
