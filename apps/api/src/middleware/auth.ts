import { createMiddleware } from "hono/factory";

import { auth } from "../lib/auth";
import { isDistributorOwner } from "../lib/guards";
import { forbidden, unauthorized } from "../lib/http";

export type AuthVariables = {
  session: (typeof auth.$Infer.Session)["session"];
  user: (typeof auth.$Infer.Session)["user"];
};

export type User = AuthVariables["user"];

export const requireSession = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!result) {
      throw unauthorized();
    }
    c.set("user", result.user);
    c.set("session", result.session);
    await next();
  }
);

export function requireOwnDistributor(user: User, distributorId: number) {
  if (!isDistributorOwner(user, distributorId)) {
    throw forbidden();
  }
}

export function requireAdmin(user: User) {
  if (user.role !== "admin") {
    throw forbidden();
  }
}
