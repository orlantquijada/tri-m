import type { SQL } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import type { User } from "../middleware/auth";

export function distributorScope(
  user: User,
  column: SQLiteColumn
): SQL | undefined {
  return user.role === "distributor" && typeof user.distributorId === "number"
    ? eq(column, user.distributorId)
    : undefined;
}
