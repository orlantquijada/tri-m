import { defineConfig } from "drizzle-kit";

export default defineConfig({
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/schema.ts",
});
