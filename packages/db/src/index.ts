import { drizzle } from "drizzle-orm/tursodatabase/database";

import { env } from "./env";
import * as schema from "./schema";

export const db = drizzle(env.DB_FILE_NAME, { casing: "snake_case", schema });
// oxlint-disable-next-line no-barrel-file
export * from "./schema";
