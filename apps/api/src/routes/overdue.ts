import { Hono } from "hono";

export const overdue = new Hono().get("/", (c) => c.json([]));
