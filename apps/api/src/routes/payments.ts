import { zValidator } from "@hono/zod-validator";
import { paymentInsertSchema } from "schema";

import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import { createPayment } from "../services/payments";

export const payments = createRouter()
  .get("/", (c) => c.json([]))
  .post(
    "/",
    requireSession,
    zValidator("json", paymentInsertSchema),
    async (c) =>
      c.json(await createPayment(c.get("user"), c.req.valid("json")), 201)
  );
