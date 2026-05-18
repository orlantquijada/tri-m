import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "./env";
import { corsMiddleware } from "./middleware/cors";
import { auditRoute } from "./routes/audit";
import { authRouter } from "./routes/auth";
import { blacklistRequests } from "./routes/blacklist";
import { customers } from "./routes/customers";
import { dashboard } from "./routes/dashboard";
import { distributors } from "./routes/distributors";
import { csvExports } from "./routes/exports";
import { overdue } from "./routes/overdue";
import { payments } from "./routes/payments";
import { receivables } from "./routes/receivables";
import { users } from "./routes/users";

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
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/auth", authRouter)
  .route("/customers", customers)
  .route("/distributors", distributors)
  .route("/receivables", receivables)
  .route("/payments", payments)
  .route("/overdue", overdue)
  .route("/dashboard", dashboard)
  .route("/users", users)
  .route("/exports", csvExports)
  .route("/blacklist-requests", blacklistRequests)
  .route("/audit", auditRoute);

export type AppType = typeof app;

export default {
  fetch: app.fetch,
  port: env.PORT,
};
