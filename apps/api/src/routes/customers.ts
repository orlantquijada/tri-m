import { Hono } from "hono";

export const customers = new Hono().get("/", (c) => c.json([]));
