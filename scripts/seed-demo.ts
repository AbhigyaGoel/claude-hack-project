/**
 * Seed demo fixtures — one demo user with a returning patient, 3 prior
 * sessions, and a pre-populated patient_memory namespace so Claude can
 * reference specific notes in the "returning patient" demo beat.
 *
 * Usage: `npm run db:seed` (requires DATABASE_URL plus the two DEMO_*_ID
 * envs). Idempotent: safe to re-run.
 *
 * Credentials: username `demo`, password `demo`.
 */

import { randomUUID } from "node:crypto";
import { getDb, closeDb } from "@/db";
import {
  users,
  patients,
  plans,
  sessions,
  sets,
  patientMemory,
} from "@/db/schema";
import { eq } from "drizzle-orm";

const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";
const DEMO_PATIENT_ID =
  process.env.DEMO_PATIENT_ID ?? "11111111-1111-1111-1111-111111111111";
const DEMO_USERNAME = process.env.DEMO_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo";

async function seedUser(): Promise<void> {
  const db = getDb();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, DEMO_USER_ID))
    .limit(1);

  if (existing.length === 0) {
    await db
      .insert(users)
      .values({
        id: DEMO_USER_ID,
        username: DEMO_USERNAME,
        password: DEMO_PASSWORD,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: { id: DEMO_USER_ID, password: DEMO_PASSWORD },
      });
    console.log(`users: seeded ${DEMO_USERNAME} / ${DEMO_PASSWORD} (${DEMO_USER_ID})`);
  } else {
    console.log(`users: ${DEMO_USERNAME} already exists (${DEMO_USER_ID})`);
  }
}

async function seedPatient(): Promise<void> {
  const db = getDb();

  const existing = await db
    .select()
    .from(patients)
    .where(eq(patients.id, DEMO_PATIENT_ID));

  if (existing.length === 0) {
    await db.insert(patients).values({
      id: DEMO_PATIENT_ID,
      user_id: DEMO_USER_ID,
      name: "Riley Chen",
      profile_json: {
        name: "Riley Chen",
        diagnostic: {
          body_region: "knee",
          side: "left",
          onset: "2 months ago, running-related",
          mechanism: "insidious",
          severity_score: 45,
          instrument_used: "KOOS",
          functional_deficits: [
            "stair descent guarding",
            "squat depth limitation",
          ],
          contraindications: [],
          red_flags: [],
          cleared_for_exercise: true,
        },
      },
    });
    console.log(`patients: seeded Riley Chen (${DEMO_PATIENT_ID})`);
  } else {
    // Re-link to the current demo user in case the FK was nulled by migration.
    await db
      .update(patients)
      .set({ user_id: DEMO_USER_ID })
      .where(eq(patients.id, DEMO_PATIENT_ID));
    console.log(`patients: ${DEMO_PATIENT_ID} already exists — re-linked to demo user`);
  }
}

async function seedPlanAndSessions(): Promise<void> {
  const db = getDb();

  const existingPlans = await db
    .select()
    .from(plans)
    .where(eq(plans.patient_id, DEMO_PATIENT_ID));

  let planId: string;
  if (existingPlans.length === 0) {
    const [row] = await db
      .insert(plans)
      .values({
        patient_id: DEMO_PATIENT_ID,
        plan_json: {
          session_number: 1,
          estimated_duration_minutes: 25,
          exercises: [
            { id: "wall_sit", name: "Wall Sit", sets: 3, reps: 10, rest_seconds: 60 },
            { id: "step_up", name: "Step Up", sets: 3, reps: 12, rest_seconds: 60 },
            { id: "terminal_knee_ext", name: "Terminal Knee Extension", sets: 3, reps: 15, rest_seconds: 45 },
          ],
        },
        active: true,
      })
      .returning({ id: plans.id });
    planId = row.id;
    console.log(`plans: seeded initial knee plan (${planId})`);
  } else {
    planId = existingPlans[0].id;
    console.log(`plans: reusing existing plan ${planId}`);
  }

  const priorSessions = [
    {
      started: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      pain_pre: 6,
      pain_post: 5,
      exercises: [
        { id: "wall_sit", name: "Wall Sit", reps: 8, form: 0.62 },
        { id: "step_up", name: "Step Up", reps: 10, form: 0.58 },
      ],
    },
    {
      started: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      pain_pre: 5,
      pain_post: 3,
      exercises: [
        { id: "wall_sit", name: "Wall Sit", reps: 10, form: 0.74 },
        { id: "step_up", name: "Step Up", reps: 12, form: 0.69 },
        { id: "terminal_knee_ext", name: "Terminal Knee Extension", reps: 15, form: 0.80 },
      ],
    },
    {
      started: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      pain_pre: 4,
      pain_post: 3,
      exercises: [
        { id: "wall_sit", name: "Wall Sit", reps: 12, form: 0.83 },
        { id: "step_up", name: "Step Up", reps: 12, form: 0.79 },
        { id: "terminal_knee_ext", name: "Terminal Knee Extension", reps: 15, form: 0.85 },
      ],
    },
  ];

  // Wipe existing seed sessions to keep the fixtures stable across reseeds.
  await db.delete(sessions).where(eq(sessions.patient_id, DEMO_PATIENT_ID));

  for (const s of priorSessions) {
    const ended = new Date(s.started.getTime() + 22 * 60 * 1000);
    const sessionId = randomUUID();
    await db.insert(sessions).values({
      id: sessionId,
      patient_id: DEMO_PATIENT_ID,
      plan_id: planId,
      user_id: DEMO_USER_ID,
      started_at: s.started,
      ended_at: ended,
      pain_pre: s.pain_pre,
      pain_post: s.pain_post,
    });

    for (let i = 0; i < s.exercises.length; i++) {
      const ex = s.exercises[i];
      await db.insert(sets).values({
        session_id: sessionId,
        exercise_id: ex.id,
        exercise_name: ex.name,
        set_number: 1,
        reps: ex.reps,
        form_score: ex.form,
      });
    }
  }

  console.log(`sessions: seeded ${priorSessions.length} prior sessions`);
}

async function seedPatientMemory(): Promise<void> {
  const db = getDb();

  const memoryFiles: { filename: string; content: string }[] = [
    {
      filename: "case_notes.md",
      content: `# Case Notes — Riley Chen (L knee)

## 2 weeks ago (session 1)
- S: Dull anterior knee pain during stair descent, sharper by end of day.
  Worst on the way *down* stairs. No morning stiffness > 5 min.
- O: Wall sit tolerable at 45° for 20s, form breakdown after rep 6 — trunk
  drifts forward. Step-up: L knee valgus at push-off (rep 4 onward).
- A: Suspect PFPS with weak glute med on L. No red flags.
- P: Wall sit, step-up, terminal knee extension. Cue: "drive through heel,
  knees tracking over middle toe."

## 1 week ago (session 2)
- Wall sit held 30s without form breakdown. Pain during stair descent
  dropped 6/10 → 4/10.
- Step-up valgus reduced — cue "knee wide, not in" landing reliably.
- Patient reports less morning guarding.

## 3 days ago (session 3)
- Full 3x12 step-up with clean tracking, no valgus noted.
- Pain on stair descent now 3/10, localized to medial patellar border.
- Wall sit → 45s. Ready to progress to single-leg bridge next session.
`,
    },
    {
      filename: "pattern_observations.md",
      content: `# Pattern Observations — Riley Chen

- **Fatigue signature:** knee valgus on L step-up appears after rep 6. Likely
  glute med fatigue, not pain-avoidance. External rotation cue lands best
  when delivered *before* the set, not mid-set.
- **Morning sensitivity:** consistent report that L knee is "sharper in the
  morning" — likely quad inhibition overnight. Open with 2 min of mini-squat
  warmup on returning-patient sessions.
- **Cue preference:** responds to body-mechanics cues ("drive through heel",
  "knee wide") better than abstract ones ("engage your glutes"). Mirror that
  language in voice coaching.
- **Pain language:** uses "dull" and "sharp" consistently. "Sharp" should
  trigger severity review; "dull" is baseline.
`,
    },
    {
      filename: "goals.md",
      content: `# Functional Goals — Riley Chen

1. Run 3 miles continuously without L knee pain (currently: stops at 1.2 mi).
2. Descend stairs foot-over-foot without hand rail.
3. Return to recreational soccer pickup games.

## Progress
- Mile 1 tolerable at a slow pace as of session 3.
- Stairs: still prefers hand rail but reports "don't really need it anymore."
- Soccer: 6+ weeks out — gate is single-leg hop symmetry.
`,
    },
    {
      filename: "progression_history.json",
      content: JSON.stringify(
        {
          entries: [
            {
              session: 1,
              exercise: "wall_sit",
              action: "start",
              rationale: "Baseline quad tolerance; start at 45° for 20s.",
            },
            {
              session: 2,
              exercise: "wall_sit",
              action: "advance_duration",
              rationale: "Held 20s without form breakdown; advance to 30s.",
            },
            {
              session: 3,
              exercise: "wall_sit",
              action: "advance_duration",
              rationale: "30s clean; advance to 45s. Form held.",
            },
            {
              session: 3,
              exercise: "step_up",
              action: "advance_reps",
              rationale: "Valgus resolved at 12 reps; hold 3x12 next session.",
            },
          ],
        },
        null,
        2,
      ),
    },
  ];

  await db
    .delete(patientMemory)
    .where(eq(patientMemory.patient_id, DEMO_PATIENT_ID));

  for (const file of memoryFiles) {
    await db.insert(patientMemory).values({
      patient_id: DEMO_PATIENT_ID,
      user_id: DEMO_USER_ID,
      filename: file.filename,
      content: file.content,
    });
  }
  console.log(`patient_memory: seeded ${memoryFiles.length} files`);
}

async function main() {
  try {
    await seedUser();
    await seedPatient();
    await seedPlanAndSessions();
    await seedPatientMemory();
    console.log(
      `\nDemo seed complete. Sign in with username "${DEMO_USERNAME}" / password "${DEMO_PASSWORD}".`,
    );
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
