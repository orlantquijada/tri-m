import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import { listOverdue } from "../services/overdue";

export const overdue = createRouter().get("/", requireSession, async (c) =>
  c.json(await listOverdue(c.get("user")))
);
