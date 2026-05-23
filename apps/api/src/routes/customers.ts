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
import { buildTimeline } from "../services/timeline";

const listFiltersSchema = z.object({
  hasOverdue: z.enum(["true", "false"]).optional(),
  missingLocation: z.enum(["true", "false"]).optional(),
  riskStatus: z.preprocess((v) => {
    if (typeof v === "string") {
      return v.split(",").filter(Boolean);
    }
    if (Array.isArray(v)) {
      return v;
    }
  }, z.array(riskStatusEnum).optional()),
});

const timelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page: z.coerce.number().int().min(1).default(1),
});

export const customers = createRouter()
  .get(
    "/",
    requireSession,
    zValidator("query", listFiltersSchema),
    async (c) => {
      const { hasOverdue, missingLocation, riskStatus } = c.req.valid("query");
      return c.json(
        await listCustomers(c.get("user"), {
          hasOverdue: hasOverdue === "true",
          missingLocation: missingLocation === "true",
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
  .get(
    "/:id/timeline",
    requireSession,
    zValidator("query", timelineQuerySchema),
    async (c) =>
      c.json(
        await buildTimeline(c.get("user"), idParam(c), c.req.valid("query"))
      )
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
