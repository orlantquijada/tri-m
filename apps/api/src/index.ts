import { Hono } from "hono";

import { env } from "./env";

const app = new Hono();

app.get("/", (c) => c.text("tri-m API"));

export default {
  fetch: app.fetch,
  port: env.PORT,
};
