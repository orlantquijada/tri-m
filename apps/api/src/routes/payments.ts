import { zValidator } from "@hono/zod-validator";
import { paymentInsertSchema, voidPaymentSchema } from "schema";

import { createRouter } from "../lib/factory";
import { idParam } from "../lib/params";
import { Scope } from "../lib/scope";
import { requireSession } from "../middleware/auth";
import { createPayment, voidPayment } from "../services/payments";

export const payments = createRouter()
  .get("/", (c) => c.json([]))
  .post(
    "/",
    requireSession,
    zValidator("json", paymentInsertSchema),
    async (c) =>
      c.json(await createPayment(c.get("user"), c.req.valid("json")), 201)
  )
  .post(
    "/:id/void",
    requireSession,
    zValidator("json", voidPaymentSchema),
    async (c) => {
      Scope.forUser(c.get("user")).assertAdmin();
      return c.json(
        await voidPayment(c.get("user"), idParam(c), c.req.valid("json"))
      );
    }
  );
