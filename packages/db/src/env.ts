import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    DB_FILE_NAME: z.string().min(1),
    TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  },
});
