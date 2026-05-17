import { createRouter } from "../lib/factory";
import { requireAdmin, requireSession } from "../middleware/auth";
import { listDistributors } from "../services/distributors";

export const distributors = createRouter().get(
  "/",
  requireSession,
  async (c) => {
    requireAdmin(c.get("user"));
    return c.json(await listDistributors());
  }
);
