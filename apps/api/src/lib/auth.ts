import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "db";

import { env } from "../env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_URL],
  user: {
    additionalFields: {
      distributorId: {
        required: false,
        type: "string",
      },
      role: {
        defaultValue: "admin",
        input: false,
        required: true,
        type: "string",
      },
    },
  },
});
