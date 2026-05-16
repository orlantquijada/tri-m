import { Hono } from "hono";

import { auth } from "../lib/auth";

export const authRouter = new Hono().on(["GET", "POST"], "/**", (c) =>
  auth.handler(c.req.raw)
);
