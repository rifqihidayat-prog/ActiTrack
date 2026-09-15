import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let client: ReturnType<typeof drizzle> | null = null;

function init() {
  const url = process.env.TURSO_DB_URL || process.env.DATABASE_URL || "file:src/db/actitrack.db";
  const token = process.env.TURSO_DB_AUTH_TOKEN;
  if (url.startsWith("libsql:") && !token) {
    throw new Error("TURSO_DB_AUTH_TOKEN must be set when using Turso cloud URL");
  }
  const sqlite = createClient({ url, authToken: token || undefined });
  client = drizzle(sqlite, { schema });
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!client) init();
    return (client as any)[prop];
  },
});
