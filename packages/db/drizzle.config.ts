import { defineConfig } from "drizzle-kit";

import { env } from "./src/env";

const isRemote =
  env.DB_FILE_NAME.startsWith("libsql:") ||
  env.DB_FILE_NAME.startsWith("http:") ||
  env.DB_FILE_NAME.startsWith("https:");

export default defineConfig({
  casing: "snake_case",
  dbCredentials: isRemote
    ? { authToken: env.TURSO_AUTH_TOKEN, url: env.DB_FILE_NAME }
    : { url: env.DB_FILE_NAME },
  dialect: isRemote ? "turso" : "sqlite",
  out: "./drizzle",
  schema: "./src/schema.ts",
});
