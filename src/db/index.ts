import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleClient | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example → .env.local and fill in your Supabase Postgres connection string.",
    );
  }
  return url;
}

export function getDb(): DrizzleClient {
  if (!_db) {
    _client = postgres(getConnectionString(), {
      prepare: false,
      max: 10,
    });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}
