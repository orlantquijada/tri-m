import { Hono } from "hono";
import { sampleEnumSchema } from "schema";

import { env } from "./env";

const app = new Hono();

const welcomeStrings = [
  "Hello Hono!",
  "To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/backend/hono",
];

app.get("/", (c) =>
  c.text(welcomeStrings.join("\n\n") + sampleEnumSchema.options)
);

export default {
  fetch: app.fetch,
  port: env.PORT,
};
