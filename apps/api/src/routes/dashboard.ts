import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import {
  getAgingBuckets,
  getCollectionTrend,
  getDashboardTotals,
  getToday,
} from "../services/dashboard";

const trendQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});

export const dashboard = createRouter()
  .get("/totals", requireSession, async (c) =>
    c.json(await getDashboardTotals(c.get("user")))
  )
  .get("/aging", requireSession, async (c) =>
    c.json(await getAgingBuckets(c.get("user")))
  )
  .get("/today", requireSession, async (c) =>
    c.json(await getToday(c.get("user")))
  )
  .get(
    "/collection-trend",
    requireSession,
    zValidator("query", trendQuerySchema),
    async (c) => {
      const { range } = c.req.valid("query");
      return c.json(await getCollectionTrend(c.get("user"), range));
    }
  );
