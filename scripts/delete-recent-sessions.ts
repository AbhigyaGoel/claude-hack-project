/**
 * One-off: delete the 2 most recent sessions for the demo patient.
 * Used to clear live test sessions (e.g. sessions 25 & 26) without reseeding.
 *
 * Usage: `npx tsx --env-file-if-exists=.env.local scripts/delete-recent-sessions.ts`
 */

import { getDb, closeDb } from "@/db";
import { sessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

const DEMO_PATIENT_ID = "11111111-1111-1111-1111-111111111111";

async function main() {
  const db = getDb();
  try {
    const recent = await db
      .select()
      .from(sessions)
      .where(eq(sessions.patient_id, DEMO_PATIENT_ID))
      .orderBy(desc(sessions.started_at))
      .limit(2);

    if (recent.length === 0) {
      console.log("No sessions found for demo patient.");
      return;
    }

    for (const r of recent) {
      console.log(`Deleting session ${r.id} (started_at ${r.started_at?.toISOString?.() ?? r.started_at})`);
      await db.delete(sessions).where(eq(sessions.id, r.id));
    }
    console.log(`\nDeleted ${recent.length} session(s).`);
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
