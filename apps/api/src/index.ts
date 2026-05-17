import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "./env";
import { corsMiddleware } from "./middleware/cors";
import { authRouter } from "./routes/auth";
import { customers } from "./routes/customers";
import { dashboard } from "./routes/dashboard";
import { overdue } from "./routes/overdue";
import { payments } from "./routes/payments";
import { receivables } from "./routes/receivables";

const app = new Hono()
  .basePath("/api")
  .use(corsMiddleware)
  // oxlint-disable-next-line promise/prefer-await-to-callbacks
  .onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  })
  .route("/auth", authRouter)
  .route("/customers", customers)
  .route("/receivables", receivables)
  .route("/payments", payments)
  .route("/overdue", overdue)
  .route("/dashboard", dashboard);

export type AppType = typeof app;

export default {
  fetch: app.fetch,
  port: env.PORT,
};
