import { Hono } from "hono";

export const receivables = new Hono().get("/", (c) => c.json([]));
