/**
 * Sanity check — confirms the Supabase connection works, the expected
 * tables exist, RLS is enabled, and the demo seed landed.
 *
 * Usage: `npm run db:check`
 */

import { sql } from "drizzle-orm";
import { getDb, closeDb } from "@/db";
import { getSupabaseAdmin, getDemoUserId, getDemoPatientId } from "@/lib/supabase";

interface TableCount {
  table: string;
  rows: number;
}

const EXPECTED_TABLES = [
  "patients",
  "plans",
  "sessions",
  "sets",
  "rep_analyses",
  "form_events",
  "red_flags",
  "narrator_log",
  "chat_messages",
  "patient_memory",
];

async function checkConnection(): Promise<void> {
  const db = getDb();
  const rows = await db.execute<{ now: Date }>(sql`select now() as now`);
  const stamp = rows[0]?.now;
  console.log(`✓ Postgres reachable — server time ${stamp?.toISOString?.() ?? stamp}`);
}

async function checkTables(): Promise<TableCount[]> {
  const db = getDb();
  const counts: TableCount[] = [];
  const missing: string[] = [];

  for (const table of EXPECTED_TABLES) {
    try {
      const rows = await db.execute<{ count: string }>(
        sql.raw(`select count(*)::text as count from public.${table}`),
      );
      counts.push({ table, rows: Number(rows[0]?.count ?? 0) });
    } catch {
      missing.push(table);
    }
  }

  if (missing.length > 0) {
    console.error(`✗ Missing tables: ${missing.join(", ")}`);
    console.error("  → Run `npm run db:migrate` or apply supabase/migrations/*.sql in the Supabase SQL editor.");
  } else {
    console.log(`✓ All ${EXPECTED_TABLES.length} tables present`);
    for (const { table, rows } of counts) {
      console.log(`    ${table.padEnd(18)} ${rows} row${rows === 1 ? "" : "s"}`);
    }
  }

  return counts;
}

async function checkRls(): Promise<void> {
  const db = getDb();
  const rows = await db.execute<{ tablename: string; rowsecurity: boolean }>(
    sql.raw(`
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public'
        and tablename in (${EXPECTED_TABLES.map((t) => `'${t}'`).join(",")})
    `),
  );

  const withoutRls = rows.filter((r) => !r.rowsecurity).map((r) => r.tablename);
  if (withoutRls.length === 0) {
    console.log("✓ RLS enabled on every table");
  } else {
    console.warn(
      `⚠ RLS NOT enabled on: ${withoutRls.join(", ")}\n  → Apply supabase/migrations/0002_enable_rls.sql`,
    );
  }
}

async function checkDemoData(counts: TableCount[]): Promise<void> {
  const patientRows = counts.find((c) => c.table === "patients")?.rows ?? 0;
  const sessionRows = counts.find((c) => c.table === "sessions")?.rows ?? 0;
  const memoryRows = counts.find((c) => c.table === "patient_memory")?.rows ?? 0;

  const demoUserId = getDemoUserId();
  const demoPatientId = getDemoPatientId();

  const admin = getSupabaseAdmin();
  const { data: user, error: userErr } = await admin.auth.admin.getUserById(demoUserId);

  if (userErr) {
    console.warn(`⚠ auth.users lookup failed: ${userErr.message}`);
  } else if (!user?.user) {
    console.warn(`⚠ Demo user ${demoUserId} not found in auth.users`);
    console.warn("  → Run `npm run db:seed` to create it");
  } else {
    console.log(`✓ Demo user present: ${user.user.email} (${demoUserId})`);
  }

  if (patientRows === 0) {
    console.warn("⚠ No patient rows. Run `npm run db:seed`.");
    return;
  }

  const db = getDb();
  const rows = await db.execute<{ id: string; name: string }>(
    sql.raw(`select id, name from public.patients where id = '${demoPatientId}'`),
  );

  if (rows.length === 0) {
    console.warn(`⚠ Demo patient ${demoPatientId} not found (but ${patientRows} other patient rows exist)`);
  } else {
    console.log(`✓ Demo patient present: ${rows[0].name}`);
    console.log(`    sessions total: ${sessionRows}`);
    console.log(`    memory files:   ${memoryRows}`);
  }
}

async function main() {
  try {
    await checkConnection();
    const counts = await checkTables();
    await checkRls();
    await checkDemoData(counts);
    console.log("\nAll checks complete.");
  } catch (err) {
    console.error("\n✗ Connection check failed:");
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

main();
