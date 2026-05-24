import { zValidator } from "@hono/zod-validator";
import {
  productInsertSchema,
  productQuerySchema,
  productUpdateSchema,
} from "schema";

import { createRouter } from "../lib/factory";
import { idParam } from "../lib/params";
import { requireSession } from "../middleware/auth";
import {
  archiveProduct,
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../services/products";

export const products = createRouter()
  .get(
    "/",
    requireSession,
    zValidator("query", productQuerySchema),
    async (c) => c.json(await listProducts(c.get("user"), c.req.valid("query")))
  )
  .post(
    "/",
    requireSession,
    zValidator("json", productInsertSchema),
    async (c) =>
      c.json(await createProduct(c.get("user"), c.req.valid("json")), 201)
  )
  .get("/:id", requireSession, async (c) =>
    c.json(await getProduct(c.get("user"), idParam(c)))
  )
  .patch(
    "/:id",
    requireSession,
    zValidator("json", productUpdateSchema),
    async (c) =>
      c.json(
        await updateProduct(c.get("user"), idParam(c), c.req.valid("json"))
      )
  )
  .post("/:id/archive", requireSession, async (c) =>
    c.json(await archiveProduct(c.get("user"), idParam(c)))
  );
