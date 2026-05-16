import { Hono } from "hono";

import { env } from "./env";
import { corsMiddleware } from "./middleware/cors";
import { customers } from "./routes/customers";
import { dashboard } from "./routes/dashboard";
import { overdue } from "./routes/overdue";
import { payments } from "./routes/payments";
import { receivables } from "./routes/receivables";

const app = new Hono()
  .basePath("/api")
  .use(corsMiddleware)
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
