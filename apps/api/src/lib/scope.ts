import type { SQL } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import type { User } from "../middleware/auth";
import { forbidden } from "./http";

export const Scope = {
  forUser(user: User) {
    return {
      assertAdmin() {
        if (user.role !== "admin") {
          throw forbidden();
        }
      },
      assertCanRead(distributorId: number) {
        if (
          user.role === "distributor" &&
          user.distributorId !== distributorId
        ) {
          throw forbidden();
        }
      },
      assertCanWrite(distributorId: number) {
        if (
          user.role === "distributor" &&
          user.distributorId !== distributorId
        ) {
          throw forbidden();
        }
      },
      filterQuery(column: SQLiteColumn): SQL | undefined {
        return user.role === "distributor" &&
          typeof user.distributorId === "number"
          ? eq(column, user.distributorId)
          : undefined;
      },
    };
  },
};
