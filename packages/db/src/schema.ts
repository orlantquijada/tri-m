import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  email: text().notNull().unique(),
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});
