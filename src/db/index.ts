import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let client: ReturnType<typeof drizzle> | null = null;

function init() {
  const url = process.env.TURSO_DB_URL;
  const token = process.env.TURSO_DB_AUTH_TOKEN;
  if (!url || !token) {
    throw new Error("TURSO_DB_URL and TURSO_DB_AUTH_TOKEN must be set");
  }
  const sqlite = createClient({ url, authToken: token });
  client = drizzle(sqlite, { schema });
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!client) init();
    return (client as any)[prop];
  },
});
