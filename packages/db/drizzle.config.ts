import { defineConfig } from "drizzle-kit";

import { env } from "./src/env";

export default defineConfig({
  casing: "snake_case",
  dbCredentials: {
    url: env.DB_FILE_NAME,
  },
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/schema.ts",
});
