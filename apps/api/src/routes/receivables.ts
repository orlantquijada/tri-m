import { zValidator } from "@hono/zod-validator";
import { receivableInsertSchema } from "schema";

import { createRouter } from "../lib/factory";
import { idParam } from "../lib/params";
import { requireSession } from "../middleware/auth";
import { createReceivable, getReceivable } from "../services/receivables";

export const receivables = createRouter()
  .get("/", requireSession, (c) => c.json([]))
  .get("/:id", requireSession, async (c) =>
    c.json(await getReceivable(c.get("user"), idParam(c)))
  )
  .post(
    "/",
    requireSession,
    zValidator("json", receivableInsertSchema),
    async (c) =>
      c.json(await createReceivable(c.get("user"), c.req.valid("json")), 201)
  );
