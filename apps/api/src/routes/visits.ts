import { zValidator } from "@hono/zod-validator";
import { visitInsertSchema, visitListQuerySchema } from "schema";

import { createRouter } from "../lib/factory";
import { idParam } from "../lib/params";
import { requireSession } from "../middleware/auth";
import {
  createVisit,
  listOpenPromises,
  listVisits,
  resolvePromise,
} from "../services/visits";

export const visits = createRouter()
  .get(
    "/",
    requireSession,
    zValidator("query", visitListQuerySchema),
    async (c) => c.json(await listVisits(c.get("user"), c.req.valid("query")))
  )
  .get("/open-promises", requireSession, async (c) =>
    c.json(await listOpenPromises(c.get("user")))
  )
  .post("/", requireSession, zValidator("json", visitInsertSchema), async (c) =>
    c.json(await createVisit(c.get("user"), c.req.valid("json")), 201)
  )
  .patch("/:id/resolve-promise", requireSession, async (c) =>
    c.json(await resolvePromise(c.get("user"), idParam(c)))
  );
