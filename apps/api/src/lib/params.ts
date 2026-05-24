import type { Context } from "hono";

import { badRequest } from "./http";

export function idParam(c: Context, name = "id"): string {
  const value = c.req.param(name)?.trim();
  if (!value) {
    throw badRequest(`Invalid ${name}`);
  }
  return value;
}
