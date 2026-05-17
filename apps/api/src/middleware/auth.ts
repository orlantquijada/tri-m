import { createMiddleware } from "hono/factory";

import { auth } from "../lib/auth";
import { unauthorized } from "../lib/http";

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
