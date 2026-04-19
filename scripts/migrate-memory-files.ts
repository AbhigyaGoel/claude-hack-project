/**
 * One-time migration — import legacy filesystem-based patient memory
 * (`patient-memory/{patient_id}/*`) into the `patient_memory` Postgres
 * table. Idempotent: running twice is safe, the second run is a no-op
 * upsert.
 *
 * Usage: `npm run db:migrate-memory`
 *
 * Notes:
 * - Patients referenced by the directory name must already exist in the
 *   `patients` table; otherwise the migration skips that directory and
 *   prints a warning. Seed the demo patient first if needed.
 * - Assumes each directory under `patient-memory/` is a valid patient UUID.
 */

import fs from "node:fs";
import path from "node:path";
import { getDb, closeDb } from "@/db";
import { patients, patientMemory } from "@/db/schema";
import { getDemoUserId } from "@/lib/supabase";
import { eq } from "drizzle-orm";

const MEMORY_ROOT = path.join(process.cwd(), "patient-memory");

async function migrate() {
  if (!fs.existsSync(MEMORY_ROOT)) {
    console.log(`No ${MEMORY_ROOT} directory — nothing to migrate.`);
    return;
  }

  const db = getDb();
  const fallbackUserId = getDemoUserId();

  const patientDirs = fs
    .readdirSync(MEMORY_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let importedFiles = 0;
  let skippedPatients = 0;

  for (const patientId of patientDirs) {
    const [row] = await db
      .select({ id: patients.id, user_id: patients.user_id })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!row) {
      console.warn(
        `skip: ${patientId} — no matching row in patients table (run seed first?)`,
      );
      skippedPatients++;
      continue;
    }

    const dir = path.join(MEMORY_ROOT, patientId);
    const files = fs.readdirSync(dir);

    for (const filename of files) {
      const full = path.join(dir, filename);
      const stat = fs.statSync(full);
      if (!stat.isFile()) continue;

      const content = fs.readFileSync(full, "utf-8");
      await db
        .insert(patientMemory)
        .values({
          patient_id: patientId,
          user_id: row.user_id ?? fallbackUserId,
          filename,
          content,
        })
        .onConflictDoUpdate({
          target: [patientMemory.patient_id, patientMemory.filename],
          set: { content, updated_at: new Date() },
        });
      importedFiles++;
    }

    console.log(`imported: ${patientId} — ${files.length} files`);
  }

  console.log(
    `\nDone. ${importedFiles} files imported across ${patientDirs.length - skippedPatients} patients${
      skippedPatients ? `, ${skippedPatients} skipped` : ""
    }.`,
  );
}

migrate()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => closeDb());
