import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import { getAgingBuckets, getDashboardTotals } from "../services/dashboard";

export const dashboard = createRouter()
  .get("/totals", requireSession, async (c) =>
    c.json(await getDashboardTotals(c.get("user")))
  )
  .get("/aging", requireSession, async (c) =>
    c.json(await getAgingBuckets(c.get("user")))
  );
