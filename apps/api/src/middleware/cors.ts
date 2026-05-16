import { cors } from "hono/cors";

import { env } from "../env";

function isLocalhost(origin: string) {
  return /^https?:\/\/localhost(:\d+)?$/u.test(origin);
}

export const corsMiddleware = cors({
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  origin: (origin) => {
    if (origin === env.WEB_URL) {
      return origin;
    }
    if (process.env.NODE_ENV !== "production" && isLocalhost(origin)) {
      return origin;
    }
    return null;
  },
});
