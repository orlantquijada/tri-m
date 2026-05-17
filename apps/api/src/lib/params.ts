import type { Context } from "hono";

import { badRequest } from "./http";

export function idParam(c: Context, name = "id"): number {
  const raw = c.req.param(name);
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw badRequest(`Invalid ${name}`);
  }
  return value;
}
