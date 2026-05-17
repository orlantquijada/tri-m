import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import { getDashboardTotals } from "../services/dashboard";

export const dashboard = createRouter().get(
  "/totals",
  requireSession,
  async (c) => c.json(await getDashboardTotals(c.get("user")))
);
