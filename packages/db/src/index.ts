import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import type { TursoDatabaseDatabase } from "drizzle-orm/tursodatabase";
import { drizzle as drizzleEmbedded } from "drizzle-orm/tursodatabase/database";

import { env } from "./env";
import * as schema from "./schema";

type Schema = typeof schema;
type DB = TursoDatabaseDatabase<Schema>;

const raw = env.DB_FILE_NAME;
const isRemote =
  raw.startsWith("libsql:") ||
  raw.startsWith("http:") ||
  raw.startsWith("https:") ||
  raw.startsWith("ws:") ||
  raw.startsWith("wss:");

export const db: DB = isRemote
  ? (drizzleLibsql({
      casing: "snake_case",
      connection: { authToken: env.TURSO_AUTH_TOKEN, url: raw },
      schema,
    }) as unknown as DB)
  : drizzleEmbedded({
      casing: "snake_case",
      connection: stripFilePrefix(raw),
      schema,
    });

function stripFilePrefix(value: string): string {
  return value.startsWith("file:") ? value.slice("file:".length) : value;
}

// oxlint-disable-next-line no-barrel-file
export * from "./schema";
