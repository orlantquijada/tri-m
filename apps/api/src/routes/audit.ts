import { zValidator } from "@hono/zod-validator";
import { auditQuerySchema } from "schema";

import { createRouter } from "../lib/factory";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";
import { listAuditEvents } from "../services/audit";

export const auditRoute = createRouter().get(
  "/",
  requireSession,
  zValidator("query", auditQuerySchema),
  async (c) => {
    Scope.forUser(c.get("user")).assertAdmin();
    return c.json(await listAuditEvents(c.req.valid("query")));
  }
);
