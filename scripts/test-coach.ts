/**
 * Smoke test for the progression coach agent. Grabs the demo patient's
 * most recent session and calls the coach directly via the SDK path —
 * no cookie/middleware required. Run: `npm run test:coach`.
 */

import { desc, eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db";
import { sessions } from "@/db/schema";
import { callClaudeSimple } from "@/lib/claude/client";
import { getDemoPatientId } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are a friendly coach. Respond with JSON only:
{"message": "one sentence", "next_steps": ["do x"], "resources": []}`;

async function main() {
  const patientId = getDemoPatientId();
  const db = getDb();

  const recent = await db
    .select()
    .from(sessions)
    .where(eq(sessions.patient_id, patientId))
    .orderBy(desc(sessions.started_at))
    .limit(1);

  if (!recent[0]) {
    console.error("No sessions found for demo patient. Run `npm run db:seed` first.");
    process.exit(1);
  }

  console.log(`Testing with session ${recent[0].id}...`);

  const t0 = Date.now();
  const response = await callClaudeSimple({
    model: "claude-haiku-4-5-20251001",
    system: SYSTEM_PROMPT,
    prompt: "Write a one-line coach note for a completed knee workout. JSON only.",
    maxTokens: 400,
  });
  const ms = Date.now() - t0;

  console.log(`\n✓ Haiku responded in ${ms}ms (${response.length} chars):\n`);
  console.log(response);
  console.log("\nIf the JSON above parses, the coach route will work end-to-end.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => closeDb());
