import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import {
  getAgingBuckets,
  getDashboardTotals,
  getToday,
} from "../services/dashboard";

export const dashboard = createRouter()
  .get("/totals", requireSession, async (c) =>
    c.json(await getDashboardTotals(c.get("user")))
  )
  .get("/aging", requireSession, async (c) =>
    c.json(await getAgingBuckets(c.get("user")))
  )
  .get("/today", requireSession, async (c) =>
    c.json(await getToday(c.get("user")))
  );
