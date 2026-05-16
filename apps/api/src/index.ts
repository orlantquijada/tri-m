import { db, users } from "db";
import { eq } from "drizzle-orm";
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

app.get("/users", async (c) => {
  const all = await db.select().from(users);
  return c.json(all);
});

app.post("/users", async (c) => {
  const body = await c.req.json<{ name: string; email: string }>();
  const [user] = await db.insert(users).values(body).returning();
  return c.json(user, 201);
});

app.delete("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [user] = await db.delete(users).where(eq(users.id, id)).returning();
  if (!user) {
    return c.json({ error: "not found" }, 404);
  }
  return c.json(user);
});

export default {
  fetch: app.fetch,
  port: env.PORT,
};
