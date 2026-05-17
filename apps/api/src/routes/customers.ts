import { zValidator } from "@hono/zod-validator";
import {
  customerInsertSchema,
  customerUpdateSchema,
  riskStatusEnum,
} from "schema";
import { z } from "zod";

import { createRouter } from "../lib/factory";
import { idParam } from "../lib/params";
import { requireSession } from "../middleware/auth";
import {
  createCustomer,
  getCustomer,
  listCustomers,
  lookupCustomersByPhone,
  updateCustomer,
} from "../services/customers";

const listFiltersSchema = z.object({
  hasOverdue: z.enum(["true", "false"]).optional(),
  riskStatus: z.preprocess((v) => {
    if (typeof v === "string") {
      return v.split(",").filter(Boolean);
    }
    if (Array.isArray(v)) {
      return v;
    }
    return;
  }, z.array(riskStatusEnum).optional()),
});

export const customers = createRouter()
  .get(
    "/",
    requireSession,
    zValidator("query", listFiltersSchema),
    async (c) => {
      const { hasOverdue, riskStatus } = c.req.valid("query");
      return c.json(
        await listCustomers(c.get("user"), {
          hasOverdue: hasOverdue === "true",
          riskStatus,
        })
      );
    }
  )
  .get(
    "/lookup",
    requireSession,
    zValidator("query", z.object({ phone: z.string().min(1) })),
    async (c) => {
      const { phone } = c.req.valid("query");
      const matches = await lookupCustomersByPhone(c.get("user"), phone);
      return c.json({ matches });
    }
  )
  .get("/:id", requireSession, async (c) =>
    c.json(await getCustomer(c.get("user"), idParam(c)))
  )
  .post(
    "/",
    requireSession,
    zValidator("json", customerInsertSchema),
    async (c) =>
      c.json(await createCustomer(c.get("user"), c.req.valid("json")), 201)
  )
  .patch(
    "/:id",
    requireSession,
    zValidator("json", customerUpdateSchema),
    async (c) =>
      c.json(
        await updateCustomer(c.get("user"), idParam(c), c.req.valid("json"))
      )
  );
