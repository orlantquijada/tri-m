import { Hono } from "hono";

export const payments = new Hono().get("/", (c) => c.json([]));
