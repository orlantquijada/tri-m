import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    PORT: z.coerce.number().default(4000),
    WEB_URL: z.url().default("http://localhost:3000"),
  },
});
