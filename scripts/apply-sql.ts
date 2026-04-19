/**
 * Apply a single SQL file to the Supabase database.
 * Use for hand-written migrations that drizzle-kit doesn't track.
 *
 * Usage: tsx scripts/apply-sql.ts supabase/migrations/0003_app_users.sql
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("usage: tsx scripts/apply-sql.ts <path-to-sql>");
    process.exit(1);
  }

  const sql = fs.readFileSync(path.resolve(fileArg), "utf-8");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { prepare: false, max: 1 });
  try {
    await client.unsafe(sql);
    console.log(`✓ Applied ${fileArg}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
