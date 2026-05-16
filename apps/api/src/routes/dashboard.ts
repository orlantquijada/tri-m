import { Hono } from "hono";

export const dashboard = new Hono().get("/", (c) => c.json([]));
