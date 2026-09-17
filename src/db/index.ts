import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let client: ReturnType<typeof drizzle> | null = null;
let initialized = false;

function init() {
  const url = process.env.TURSO_DB_URL || process.env.DATABASE_URL || "file:src/db/actitrack.db";
  const token = process.env.TURSO_DB_AUTH_TOKEN;
  if (url.startsWith("libsql:") && !token) {
    throw new Error("TURSO_DB_AUTH_TOKEN must be set when using Turso cloud URL");
  }
  const sqlite = createClient({ url, authToken: token || undefined });
  client = drizzle(sqlite, { schema });

  if (!initialized) {
    initialized = true;
    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        coverage_radius_km REAL NOT NULL DEFAULT 5.0,
        address TEXT DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).catch((err) => console.error("Error ensuring stores table:", err));
  }
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!client) init();
    return (client as any)[prop];
  },
});

