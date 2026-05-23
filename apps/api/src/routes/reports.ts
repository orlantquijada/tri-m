import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { createRouter } from "../lib/factory";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";
import { getDistributorPerformance } from "../services/reports";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const reports = createRouter().get(
  "/distributor-performance",
  requireSession,
  zValidator("query", querySchema),
  async (c) => {
    Scope.forUser(c.get("user")).assertAdmin();
    return c.json(await getDistributorPerformance(c.req.valid("query")));
  }
);
