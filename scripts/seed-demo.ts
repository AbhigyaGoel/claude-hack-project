/**
 * Seed demo fixtures — one demo user (`demo`/`demo`) with a returning
 * patient (Riley Chen) and 8 prior sessions spanning ~6 weeks across
 * multiple pain points: left knee (PFPS-like), right shoulder (impingement
 * pattern), and lumbar spine (flexion-intolerant flare after lifting).
 *
 * The 8 sessions intentionally rotate focus across body regions — knee
 * baseline, shoulder screening, shoulder-focused block, knee flare, lumbar
 * flare, lumbar recovery, then two integrated multi-region sessions.
 * Each session logs a region-appropriate fault mix so the report agent has
 * a rich longitudinal record across 3 regions to synthesize.
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
  formEvents,
  patientMemory,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildFallbackReport } from "@/agents/sessionReport";

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

  const profile = {
    name: "Riley Chen",
    // Primary complaint that brought Riley in, but the full case has
    // secondary concerns below that each drive dedicated blocks of the
    // 8-session history.
    diagnostic: {
      body_region: "knee",
      side: "left",
      onset: "6 weeks ago, running-related",
      mechanism: "insidious — increased mileage before onset",
      severity_score: 48,
      instrument_used: "KOOS",
      functional_deficits: [
        "L knee pain on stair descent (PFPS-like)",
        "R shoulder pain on overhead reach and side-lying sleep",
        "lumbar stiffness in flexion, flare after lifting",
        "prolonged sitting discomfort (theater sign)",
      ],
      contraindications: [],
      red_flags: [],
      cleared_for_exercise: true,
    },
    secondary_concerns: [
      {
        body_region: "shoulder",
        side: "right",
        onset: "developed during treatment (session 2) — desk ergonomics + swimming",
        pattern: "subacromial impingement — painful arc 80–110°",
      },
      {
        body_region: "lumbar",
        side: "central",
        onset: "flare at week 4 after lifting boxes",
        pattern: "flexion-intolerant, centralizes with extension",
      },
    ],
  };

  const existing = await db
    .select()
    .from(patients)
    .where(eq(patients.id, DEMO_PATIENT_ID));

  if (existing.length === 0) {
    await db.insert(patients).values({
      id: DEMO_PATIENT_ID,
      user_id: DEMO_USER_ID,
      name: profile.name,
      profile_json: profile,
    });
    console.log(`patients: seeded Riley Chen (${DEMO_PATIENT_ID})`);
  } else {
    // Re-link to the current demo user and refresh profile to reflect the
    // multi-region case.
    await db
      .update(patients)
      .set({ user_id: DEMO_USER_ID, profile_json: profile })
      .where(eq(patients.id, DEMO_PATIENT_ID));
    console.log(`patients: ${DEMO_PATIENT_ID} already exists — relinked + profile refreshed`);
  }
}

interface PriorExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  form: number;
  faults?: { fault: string; severity: number; cue?: string }[];
}

interface PriorSession {
  daysAgo: number;
  durationMin: number;
  pain_pre: number;
  pain_post: number;
  focus: "knee" | "shoulder" | "lumbar" | "integrated";
  note: string;
  exercises: PriorExercise[];
}

/**
 * Exercise and fault shorthand builders so each session literal stays
 * readable — 24 sessions in the full literal form would bury the clinical
 * arcs in punctuation.
 */
function ex(
  id: string,
  name: string,
  sets: number,
  reps: number,
  form: number,
  faults?: { fault: string; severity: number; cue?: string }[],
): PriorExercise {
  return { id, name, sets, reps, form, faults };
}
function f(fault: string, severity: number, cue?: string) {
  return { fault, severity, cue };
}

/**
 * Each region has its own 8-session clinical arc so the progress page can
 * filter to one pain point and see a coherent trajectory — baseline → flare
 * → recovery → breakthrough → plateau → consolidation → best. Dates are
 * spread across ~13 weeks and interleaved across regions, so the global
 * session list also reads naturally.
 */
const KNEE_SESSIONS: PriorSession[] = [
  {
    daysAgo: 90, durationMin: 18, pain_pre: 7, pain_post: 6, focus: "knee",
    note: "Baseline — L knee PFPS. Quad inhibition evident, stair descent painful.",
    exercises: [
      ex("quad_set_01", "Quad Set", 3, 10, 0.58, [
        f("incomplete_knee_extension", 3, "Push the back of the knee into the floor"),
        f("quad_inhibition", 3),
      ]),
      ex("straight_leg_raise_supine_01", "Supine Straight Leg Raise", 2, 8, 0.52, [
        f("hip_flexion_compensation", 3, "Lead with the kneecap, not the hip"),
      ]),
      ex("heel_slide_01", "Heel Slide", 2, 10, 0.61, [f("limited_rom", 2)]),
    ],
  },
  {
    daysAgo: 83, durationMin: 22, pain_pre: 6, pain_post: 5, focus: "knee",
    note: "Slight tolerance gain. Added wall sit isometric at 60° — held 15s twice.",
    exercises: [
      ex("quad_set_01", "Quad Set", 3, 12, 0.66, [f("incomplete_knee_extension", 2)]),
      ex("straight_leg_raise_supine_01", "Supine Straight Leg Raise", 3, 10, 0.63, [
        f("hip_flexion_compensation", 2),
      ]),
      ex("wall_sit_01", "Wall Sit", 2, 1, 0.58, [
        f("forward_lean", 3, "Back flat against the wall"),
        f("knee_valgus", 2, "Knees wide, track over middle toe"),
      ]),
    ],
  },
  {
    daysAgo: 72, durationMin: 14, pain_pre: 8, pain_post: 7, focus: "knee",
    note: "FLARE after weekend hike. Sharp on stair descent. Pulled back to floor work only.",
    exercises: [
      ex("quad_set_01", "Quad Set", 2, 10, 0.54, [
        f("quad_inhibition", 3),
        f("pain_guarding", 3),
      ]),
      ex("heel_slide_01", "Heel Slide", 2, 8, 0.57, [
        f("limited_rom", 3, "Only go as far as comfortable"),
      ]),
    ],
  },
  {
    daysAgo: 60, durationMin: 20, pain_pre: 6, pain_post: 4, focus: "knee",
    note: "Recovering from flare. Reintroduced mini-squat. Cue 'knees wide' landed well.",
    exercises: [
      ex("quad_set_01", "Quad Set", 3, 12, 0.74),
      ex("straight_leg_raise_supine_01", "Supine Straight Leg Raise", 3, 10, 0.71),
      ex("mini_squat_01", "Mini Squat", 3, 10, 0.62, [
        f("knee_valgus", 3, "Knees track over middle toe"),
        f("weight_shift_right", 2, "50/50 weight through both feet"),
        f("shallow_depth", 2),
      ]),
    ],
  },
  {
    daysAgo: 48, durationMin: 24, pain_pre: 5, pain_post: 3, focus: "knee",
    note: "Breakthrough — wall sit held 30s × 3. Stair descent 5 → 3.",
    exercises: [
      ex("mini_squat_01", "Mini Squat", 3, 12, 0.76, [f("knee_valgus", 2, "Knees wide")]),
      ex("wall_sit_01", "Wall Sit", 3, 1, 0.78, [f("forward_lean", 2)]),
      ex("terminal_knee_extension_01", "Terminal Knee Extension", 3, 15, 0.81),
    ],
  },
  {
    daysAgo: 36, durationMin: 25, pain_pre: 4, pain_post: 3, focus: "knee",
    note: "Plateau. Observed glute med fatigue driving step-up valgus after rep 6.",
    exercises: [
      ex("mini_squat_01", "Mini Squat", 3, 12, 0.77, [f("weight_shift_right", 2)]),
      ex("step_up_01", "Step-Up", 3, 10, 0.68, [
        f("knee_valgus", 3, "Drive through the heel, knee wide"),
        f("trunk_rotation", 2),
        f("heel_rise", 2, "Push through the whole foot"),
      ]),
      ex("clamshell_knee_01", "Clamshell", 3, 15, 0.82),
    ],
  },
  {
    daysAgo: 22, durationMin: 27, pain_pre: 3, pain_post: 2, focus: "knee",
    note: "Added lateral band walk for glute med. Step-up valgus reduced after cue 'knee wide.'",
    exercises: [
      ex("step_up_01", "Step-Up", 3, 12, 0.80, [f("knee_valgus", 2)]),
      ex("lateral_band_walk_knee_01", "Lateral Band Walk", 3, 12, 0.79, [
        f("trunk_lean", 2, "Upright torso, hips level"),
      ]),
      ex("wall_sit_01", "Wall Sit", 3, 1, 0.85),
      ex("single_leg_squat_01", "Single-Leg Squat (assisted)", 2, 6, 0.63, [
        f("pelvic_drop", 3, "Keep hips level — don't let the opposite side drop"),
      ]),
    ],
  },
  {
    daysAgo: 9, durationMin: 28, pain_pre: 2, pain_post: 1, focus: "knee",
    note: "Best session to date. Stair descent 'barely noticeable.' Ready to test jog tolerance.",
    exercises: [
      ex("step_up_01", "Step-Up", 3, 12, 0.86),
      ex("step_down_01", "Step-Down (eccentric)", 3, 10, 0.74, [
        f("knee_valgus", 2),
        f("rapid_descent", 2, "Three-second lower, control the bottom"),
      ]),
      ex("lateral_band_walk_knee_01", "Lateral Band Walk", 3, 15, 0.84),
      ex("single_leg_squat_01", "Single-Leg Squat (assisted)", 3, 8, 0.72, [
        f("pelvic_drop", 2, "Hips level"),
      ]),
    ],
  },
];

const SHOULDER_SESSIONS: PriorSession[] = [
  {
    daysAgo: 86, durationMin: 18, pain_pre: 6, pain_post: 5, focus: "shoulder",
    note: "R shoulder screen. Pain with overhead reach; desk ergonomics + swimming suspected.",
    exercises: [
      ex("pendulum_01", "Pendulum", 2, 20, 0.70, [
        f("muscular_engagement", 2, "Let the arm hang — gravity does the work"),
      ]),
      ex("scapular_retraction_01", "Scapular Retraction", 2, 12, 0.64, [
        f("shoulder_shrug", 3, "Down and back — don't hike the shoulders"),
        f("neck_tension", 2),
      ]),
    ],
  },
  {
    daysAgo: 74, durationMin: 22, pain_pre: 7, pain_post: 6, focus: "shoulder",
    note: "Painful arc 80–110° confirms subacromial impingement.",
    exercises: [
      ex("pendulum_01", "Pendulum", 3, 20, 0.78),
      ex("scapular_retraction_01", "Scapular Retraction", 3, 12, 0.70),
      ex("external_rotation_sidelying_01", "Sidelying External Rotation", 2, 10, 0.58, [
        f("elbow_drift", 3, "Keep a towel pinned under the elbow"),
        f("compensation_trunk_rotation", 2),
      ]),
    ],
  },
  {
    daysAgo: 63, durationMin: 24, pain_pre: 5, pain_post: 4, focus: "shoulder",
    note: "Tolerating load. Introduced wall slide; lumbar extension compensation requires 'ribs down' cue every set.",
    exercises: [
      ex("pendulum_01", "Pendulum", 3, 20, 0.82),
      ex("wall_slide_01", "Wall Slide", 3, 10, 0.62, [
        f("lumbar_extension", 3, "Ribs down, low back flat against the wall"),
        f("shoulder_shrug", 3, "Shoulders down and back"),
        f("elbow_loss_contact", 2),
      ]),
      ex("external_rotation_sidelying_01", "Sidelying External Rotation", 3, 12, 0.66),
    ],
  },
  {
    daysAgo: 52, durationMin: 24, pain_pre: 5, pain_post: 4, focus: "shoulder",
    note: "Pendulum clean. Added prone Y raise — upper trap dominance evident.",
    exercises: [
      ex("pendulum_01", "Pendulum", 3, 20, 0.85),
      ex("wall_slide_01", "Wall Slide", 3, 12, 0.71, [f("lumbar_extension", 2)]),
      ex("prone_y_raise_01", "Prone Y Raise", 3, 10, 0.65, [
        f("upper_trap_dominance", 3, "Lead with the thumbs, low traps down and back"),
        f("neck_extension", 2),
      ]),
    ],
  },
  {
    daysAgo: 40, durationMin: 25, pain_pre: 4, pain_post: 3, focus: "shoulder",
    note: "Progress. Wall slide 0.62 → 0.78. Added prone T and ER band at 90°.",
    exercises: [
      ex("wall_slide_01", "Wall Slide", 3, 12, 0.78),
      ex("prone_y_raise_01", "Prone Y Raise", 3, 12, 0.72),
      ex("prone_t_raise_01", "Prone T Raise", 3, 10, 0.68, [f("upper_trap_dominance", 2)]),
      ex("external_rotation_band_01", "External Rotation (band)", 3, 12, 0.74, [
        f("elbow_drift", 2),
      ]),
    ],
  },
  {
    daysAgo: 30, durationMin: 26, pain_pre: 4, pain_post: 3, focus: "shoulder",
    note: "Added prone W raise. Lumbar compensation still present — cue 'forehead resting' every set.",
    exercises: [
      ex("wall_slide_01", "Wall Slide", 3, 15, 0.82),
      ex("prone_w_raise_01", "Prone W Raise", 3, 10, 0.70, [
        f("lumbar_extension", 2, "Forehead resting, low back relaxed"),
        f("elbow_drop", 2),
      ]),
      ex("external_rotation_band_90_01", "External Rotation (band, 90°)", 3, 12, 0.76),
    ],
  },
  {
    daysAgo: 18, durationMin: 27, pain_pre: 3, pain_post: 2, focus: "shoulder",
    note: "Closed-chain introduced. Scapular push-up clean. Overhead reach at low load now pain-free.",
    exercises: [
      ex("prone_w_raise_01", "Prone W Raise", 3, 12, 0.78),
      ex("scapular_push_up_01", "Scapular Push-Up", 3, 10, 0.74, [
        f("elbow_flexion", 2, "Arms straight — move only the shoulder blades"),
      ]),
      ex("shoulder_flexion_supine_01", "Supine Shoulder Flexion", 3, 12, 0.80),
    ],
  },
  {
    daysAgo: 6, durationMin: 28, pain_pre: 2, pain_post: 1, focus: "shoulder",
    note: "Best session to date. Full overhead ROM pain-free at light load. Swim stroke review next session.",
    exercises: [
      ex("scapular_push_up_01", "Scapular Push-Up", 3, 12, 0.85),
      ex("prone_y_raise_01", "Prone Y Raise", 3, 15, 0.83),
      ex("shoulder_er_standing_band_01", "Standing ER (band)", 3, 12, 0.86),
      ex("wall_angel_01", "Wall Angel", 3, 10, 0.82, [f("forward_head", 2)]),
    ],
  },
];

const LUMBAR_SESSIONS: PriorSession[] = [
  {
    daysAgo: 80, durationMin: 14, pain_pre: 8, pain_post: 7, focus: "lumbar",
    note: "Acute flare after lifting boxes. Flexion-intolerant, centralizes with extension. Directional-preference work only.",
    exercises: [
      ex("prone_press_up_01", "Prone Press-Up (extension bias)", 3, 10, 0.60, [
        f("incomplete_extension", 2, "Press up from the elbows, hips stay down"),
        f("glute_engagement", 2, "Let the low back relax into extension"),
      ]),
      ex("pelvic_tilt_supine_01", "Supine Pelvic Tilt", 2, 12, 0.68),
    ],
  },
  {
    daysAgo: 67, durationMin: 18, pain_pre: 7, pain_post: 6, focus: "lumbar",
    note: "Centralizing — pain retreating from R glute to L4-5 only.",
    exercises: [
      ex("prone_press_up_01", "Prone Press-Up", 3, 10, 0.68),
      ex("pelvic_tilt_supine_01", "Supine Pelvic Tilt", 3, 12, 0.74),
      ex("cat_cow_01", "Cat-Cow", 2, 10, 0.72, [f("cervical_overextension", 2)]),
    ],
  },
  {
    daysAgo: 58, durationMin: 20, pain_pre: 6, pain_post: 5, focus: "lumbar",
    note: "Introduced anti-rotation. Bird dog with lumbar rotation — needs 'hips square' cue each set.",
    exercises: [
      ex("prone_press_up_01", "Prone Press-Up", 3, 10, 0.75),
      ex("bird_dog_01", "Bird Dog", 3, 8, 0.62, [
        f("lumbar_rotation", 3, "Hips square to the floor — no twist"),
        f("lumbar_sag", 2, "Long spine, neutral low back"),
      ]),
      ex("cat_cow_01", "Cat-Cow", 3, 10, 0.78),
    ],
  },
  {
    daysAgo: 45, durationMin: 22, pain_pre: 5, pain_post: 4, focus: "lumbar",
    note: "Motor control block. Dead bug anti-extension challenging; breath-holding pattern noted.",
    exercises: [
      ex("bird_dog_01", "Bird Dog", 3, 10, 0.70, [f("lumbar_rotation", 2)]),
      ex("dead_bug_01", "Dead Bug", 3, 10, 0.64, [
        f("lumbar_extension", 3, "Low back pressed into the floor throughout"),
        f("breath_holding", 2, "Exhale on the reach"),
      ]),
      ex("mcgill_curl_up_01", "McGill Curl-Up", 3, 8, 0.66, [
        f("neck_flexion", 2, "Head and neck rigid — chin neutral"),
      ]),
    ],
  },
  {
    daysAgo: 34, durationMin: 24, pain_pre: 4, pain_post: 3, focus: "lumbar",
    note: "Plateau — pain stable, form steady. Ready to add loading.",
    exercises: [
      ex("bird_dog_01", "Bird Dog", 3, 10, 0.78),
      ex("dead_bug_01", "Dead Bug", 3, 10, 0.72),
      ex("mcgill_curl_up_01", "McGill Curl-Up", 3, 10, 0.74),
    ],
  },
  {
    daysAgo: 25, durationMin: 26, pain_pre: 4, pain_post: 3, focus: "lumbar",
    note: "Hip hinge prep — lumbar flexion returns under load. Cueing a hinge pattern explicitly.",
    exercises: [
      ex("dead_bug_01", "Dead Bug", 3, 12, 0.80),
      ex("bird_dog_01", "Bird Dog", 3, 12, 0.82),
      ex("hip_hinge_01", "Hip Hinge", 3, 10, 0.68, [
        f("lumbar_flexion", 3, "Long spine — hinge at the hips, not the low back"),
        f("knee_bend", 2),
      ]),
      ex("glute_bridge_01", "Glute Bridge", 3, 12, 0.75),
    ],
  },
  {
    daysAgo: 14, durationMin: 27, pain_pre: 3, pain_post: 2, focus: "lumbar",
    note: "Integrated loading. Hip hinge form improving; glutes taking over for the low back.",
    exercises: [
      ex("hip_hinge_01", "Hip Hinge", 3, 12, 0.78, [f("lumbar_flexion", 2)]),
      ex("glute_bridge_01", "Glute Bridge", 3, 15, 0.82),
      ex("bird_dog_01", "Bird Dog", 3, 12, 0.86),
      ex("dead_bug_01", "Dead Bug", 3, 15, 0.84),
    ],
  },
  {
    daysAgo: 3, durationMin: 28, pain_pre: 2, pain_post: 1, focus: "lumbar",
    note: "Best session to date. Pain-free hip hinge at 10 kg test load. Ready for lift-specific work.",
    exercises: [
      ex("hip_hinge_01", "Hip Hinge", 3, 15, 0.86),
      ex("glute_bridge_01", "Glute Bridge", 3, 15, 0.88),
      ex("dead_bug_01", "Dead Bug", 3, 15, 0.88),
      ex("mcgill_curl_up_01", "McGill Curl-Up", 3, 12, 0.85),
    ],
  },
];

const PRIOR_SESSIONS: PriorSession[] = [
  ...KNEE_SESSIONS,
  ...SHOULDER_SESSIONS,
  ...LUMBAR_SESSIONS,
];


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
          session_number: 9,
          estimated_duration_minutes: 30,
          exercises: [
            { id: "step_up_01", name: "Step-Up", sets: 3, reps: 12, rest_seconds: 60 },
            { id: "step_down_01", name: "Step-Down (eccentric)", sets: 3, reps: 10, rest_seconds: 60 },
            { id: "single_leg_squat_01", name: "Single-Leg Squat (assisted)", sets: 3, reps: 8, rest_seconds: 75 },
            { id: "prone_w_raise_01", name: "Prone W Raise", sets: 3, reps: 12, rest_seconds: 45 },
            { id: "scapular_push_up_01", name: "Scapular Push-Up", sets: 3, reps: 12, rest_seconds: 45 },
            { id: "bird_dog_01", name: "Bird Dog", sets: 3, reps: 10, rest_seconds: 45 },
            { id: "dead_bug_01", name: "Dead Bug", sets: 3, reps: 10, rest_seconds: 45 },
          ],
        },
        active: true,
      })
      .returning({ id: plans.id });
    planId = row.id;
    console.log(`plans: seeded integrated multi-region plan (${planId})`);
  } else {
    planId = existingPlans[0].id;
    console.log(`plans: reusing existing plan ${planId}`);
  }

  // Wipe existing seed sessions to keep the fixtures stable across reseeds.
  await db.delete(sessions).where(eq(sessions.patient_id, DEMO_PATIENT_ID));

  interface SeededSession {
    sessionId: string;
    started: Date;
    ended: Date;
    source: (typeof PRIOR_SESSIONS)[number];
    sets: Array<{
      id: string;
      exercise_id: string;
      exercise_name: string;
      set_number: number;
      reps: number;
      form_score: number | null;
    }>;
    form_events: Array<{
      id: string;
      set_id: string;
      fault: string | null;
      severity: number | null;
    }>;
  }

  const seeded: SeededSession[] = [];

  for (const s of PRIOR_SESSIONS) {
    const started = new Date(Date.now() - s.daysAgo * 24 * 60 * 60 * 1000);
    const ended = new Date(started.getTime() + s.durationMin * 60 * 1000);
    const sessionId = randomUUID();

    await db.insert(sessions).values({
      id: sessionId,
      patient_id: DEMO_PATIENT_ID,
      plan_id: planId,
      user_id: DEMO_USER_ID,
      started_at: started,
      ended_at: ended,
      pain_pre: s.pain_pre,
      pain_post: s.pain_post,
      summary_json: { focus: s.focus, note: s.note },
    });

    const sessionBuf: SeededSession = {
      sessionId,
      started,
      ended,
      source: s,
      sets: [],
      form_events: [],
    };

    for (const ex of s.exercises) {
      for (let setNum = 1; setNum <= ex.sets; setNum++) {
        const [setRow] = await db
          .insert(sets)
          .values({
            session_id: sessionId,
            exercise_id: ex.id,
            exercise_name: ex.name,
            set_number: setNum,
            reps: ex.reps,
            form_score: ex.form,
          })
          .returning({ id: sets.id });

        sessionBuf.sets.push({
          id: setRow.id,
          exercise_id: ex.id,
          exercise_name: ex.name,
          set_number: setNum,
          reps: ex.reps,
          form_score: ex.form,
        });

        // Attach form-event faults once per exercise (on set 1) so the
        // report agent sees a representative fault list without inflating
        // counts per set.
        if (setNum === 1 && ex.faults && ex.faults.length > 0) {
          for (let j = 0; j < ex.faults.length; j++) {
            const f = ex.faults[j];
            await db.insert(formEvents).values({
              set_id: setRow.id,
              t_ms: (j + 1) * 2500,
              fault: f.fault,
              severity: f.severity,
              cue_sent: f.cue ?? null,
            });

            sessionBuf.form_events.push({
              id: randomUUID(),
              set_id: setRow.id,
              fault: f.fault,
              severity: f.severity,
            });
          }
        }
      }
    }

    seeded.push(sessionBuf);
  }

  // Pre-populate each session's `summary_json` with a fallback report so the
  // report page renders instantly on first view without waiting for a Claude
  // round-trip. Real (post-workout) sessions still go through Opus via
  // /api/report; only these seeded fixtures ship pre-baked.
  const sessionHistoryAll = seeded.map((b) => ({
    id: b.sessionId,
    date: b.started,
    pain_pre: b.source.pain_pre,
    pain_post: b.source.pain_post,
    summary: null,
  }));

  for (const b of seeded) {
    const report = buildFallbackReport({
      session: {
        id: b.sessionId,
        started_at: b.started,
        ended_at: b.ended,
        patient_id: DEMO_PATIENT_ID,
        plan_id: planId,
        pain_pre: b.source.pain_pre,
        pain_post: b.source.pain_post,
      },
      patient: { name: "Riley Chen" },
      plan: null,
      sets: b.sets,
      form_events: b.form_events,
      session_history: sessionHistoryAll,
    });

    // Stash the session focus/note alongside the report so the progress
    // page's focus badge + narrative beat still read out of summary_json.
    const merged = {
      ...report,
      focus: b.source.focus,
      note: b.source.note,
    };

    await db
      .update(sessions)
      .set({ summary_json: merged })
      .where(eq(sessions.id, b.sessionId));
  }

  console.log(`sessions: seeded ${PRIOR_SESSIONS.length} prior sessions across 3 regions`);
}

async function seedPatientMemory(): Promise<void> {
  const db = getDb();

  const memoryFiles: { filename: string; content: string }[] = [
    {
      filename: "case_notes.md",
      content: `# Case Notes — Riley Chen (multi-region)

**Primary:** L knee PFPS (running-related, insidious onset 6 weeks ago)
**Secondary:** R shoulder subacromial impingement (developed during treatment, desk + swimming)
**Tertiary:** Lumbar flare (flexion-intolerant, post-lifting, centralizes with extension)

## Session 1 (6 weeks ago) — KNEE baseline
- S: Anterior L knee pain on stair descent, theater sign, end-of-day ache.
- O: Quad inhibition (can't flatten popliteal fossa). SLR with hip-flexion
  substitution. Heel slide limited to ~110° by pain.
- A: Consistent with PFPS. No red flags.
- P: Quad reactivation, tolerable isometrics.

## Session 2 — KNEE progress + shoulder flag
- Quad set form 0.58 → 0.66. SLR substitution reducing after cueing.
- NEW: patient reports R shoulder pain on overhead reach (past week).
  Added pendulum + scap retraction as screen. Upper trap dominance evident.

## Session 3 — SHOULDER focus
- Painful arc 80–110° consistent with subacromial impingement. Sleeping
  on R side disturbs. Ergonomic counseling given (monitor height, swim
  stroke review).
- Introduced wall slide, sidelying ER. Elbow drift on ER without a towel
  cue. Lumbar extension compensation on wall slide — cue "ribs down."

## Session 4 — SHOULDER progress + KNEE flare
- Shoulder wall slide 0.62 → 0.71, pendulum clean.
- Knee flare (6/10 → 5/10 across session) after weekend hike. Pulled
  loaded knee work, kept floor-based heel slide at reduced depth.

## Session 5 — LUMBAR flare
- NEW: acute low back pain Sunday after lifting moving boxes. Flexion-
  intolerant, pain referred to R glute (no below-knee radiation). No
  red flags (no bowel/bladder change, no saddle anesthesia, no progressive
  weakness).
- Centralizes with extension. Paused shoulder/knee loading entirely.
- P: directional preference — prone press-up, pelvic tilt, cat-cow.

## Session 6 — LUMBAR recovery + multi-region resume
- Lumbar centralized — pain out of the glute, localized L4-5. Bird dog
  and dead bug introduced; lumbar sag and extension compensation noted.
- Shoulder recheck: painful arc resolved at low loads.
- Knee check: no residual flare symptoms.

## Session 7 — INTEGRATED multi-region
- First session loading all 3 regions. Knee valgus returns on mini-squat
  (sev 2) — glute med fatigue pattern confirmed. Shoulder Y raise with
  upper trap dominance; W raise with lumbar compensation. Bird dog clean.

## Session 8 — INTEGRATED best
- Pain 2 pre / 1 post. Stair descent "barely noticeable." Overhead reach
  pain-free at test loads. Lumbar held in extension bias.
- Readiness for jog test: single-leg hop symmetry (next session).
`,
    },
    {
      filename: "pattern_observations.md",
      content: `# Pattern Observations — Riley Chen (multi-region)

## Cross-region patterns
- **Flare trigger:** weekend recreational loading (hiking session 4,
  lifting session 5) reliably spikes pain 2–3 points for 3–4 days.
  Pre-empt with a deload week if scheduling reveals a big weekend ahead.
- **Compensation cascade:** whenever a region flares, the others bleed
  volume — session 5 lumbar flare paused shoulder and knee loading.
  Build in "minimum effective dose" per region so gains don't backslide
  during single-region flares.

## Knee (L) — PFPS
- L-knee valgus on step-up/single-leg squat *after rep 6*. Glute med
  fatigue, not pain-avoidance. Cue "knee wide" works best *before* the
  set, not mid-rep.
- Pelvic drop on L single-leg stance from session 7 onward — drives the
  valgus cascade. Priority corrective.

## Shoulder (R) — subacromial impingement
- Upper trap dominance on every scapular exercise. Cue "shoulders down
  and back" lands; "engage your lower trap" does not.
- Lumbar extension compensation on wall slides — cue "ribs down"
  required every set.

## Lumbar — flexion-intolerant
- Centralizes reliably with prone press-up. Directional preference:
  extension. Avoid McKenzie flexion tests.
- Dead bug triggers lumbar extension compensation — cue "low back
  pressed into the floor" every rep, at least for now.

## Coaching
- **Cue preference:** concrete mechanical cues ("knees wide", "ribs down",
  "drive through the heel", "push the floor away") land better than
  abstract ones ("engage your glutes / lower traps / core"). Match that
  in voice coaching across regions.
- **Pain language:** distinguishes "sharp" (stair descent, lumbar flare)
  from "dull" (baseline). Sharp warrants severity review.
- **Morale marker:** session 6 centralization was emotionally significant
  — "I thought I'd broken my back." Reference it on future plateaus as
  evidence of trajectory.
`,
    },
    {
      filename: "goals.md",
      content: `# Functional Goals — Riley Chen

## Knee
1. Run 5 km continuously without L knee pain (currently: not running).
2. Descend stairs foot-over-foot at normal pace, pain-free.
3. Return to recreational soccer pickup games.

## Shoulder
1. Swim freestyle continuously without R shoulder pain (currently: avoided).
2. Reach overhead to shelves without pain or compensation.
3. Sleep on R side without waking.

## Lumbar
1. Lift a 20 kg box from the floor without pain or flare.
2. Sit for a 60-min meeting without repositioning.
3. Return to weekend hiking without 3-day flare recovery.

## Progress snapshot
- Stair descent pain: 6/10 → 1/10 over 8 sessions.
- Overhead reach pain: 5/10 → 1/10 after shoulder block.
- Lumbar: centralized, pain out of the glute.
- Running / swimming / hiking: not yet retested. Gates = single-leg hop
  symmetry ≥ 90% (run), pain-free wall slide at full ROM (swim),
  pain-free 20 kg hip-hinge (lift).
`,
    },
    {
      filename: "progression_history.json",
      content: JSON.stringify(
        {
          entries: [
            { session: 1, region: "knee", exercise: "quad_set_01", action: "start", rationale: "Quad reactivation baseline." },
            { session: 2, region: "shoulder", exercise: "pendulum_01", action: "add", rationale: "New R shoulder complaint — add gentle screen." },
            { session: 2, region: "shoulder", exercise: "scapular_retraction_01", action: "add", rationale: "Screen for upper trap dominance pattern." },
            { session: 3, region: "shoulder", exercise: "wall_slide_01", action: "add", rationale: "Painful arc confirmed — load scap control." },
            { session: 3, region: "shoulder", exercise: "external_rotation_sidelying_01", action: "add", rationale: "Rotator cuff load at non-provocative angle." },
            { session: 4, region: "knee", exercise: "quad_set_01", action: "reduce_volume", rationale: "Weekend-hike flare — pull loaded work." },
            { session: 4, region: "shoulder", exercise: "prone_y_raise_01", action: "add", rationale: "Progress low-trap loading beyond scap retraction." },
            { session: 5, region: "lumbar", exercise: "prone_press_up_01", action: "start", rationale: "Acute flare, flexion-intolerant — directional preference." },
            { session: 5, region: "lumbar", exercise: "pelvic_tilt_supine_01", action: "add", rationale: "Gentle motor control, pain-free range." },
            { session: 6, region: "lumbar", exercise: "bird_dog_01", action: "add", rationale: "Centralized — introduce anti-rotation motor control." },
            { session: 6, region: "lumbar", exercise: "dead_bug_01", action: "add", rationale: "Anti-extension in supine, teach lumbar neutral." },
            { session: 7, region: "knee", exercise: "mini_squat_01", action: "resume", rationale: "Knee flare resolved — return to closed-chain." },
            { session: 7, region: "knee", exercise: "lateral_band_walk_knee_01", action: "add", rationale: "Glute med — target the valgus driver directly." },
            { session: 7, region: "shoulder", exercise: "prone_w_raise_01", action: "add", rationale: "Progress low/mid trap loading." },
            { session: 8, region: "knee", exercise: "step_up_01", action: "advance", rationale: "Form clean at 3×12 — progress to functional load." },
            { session: 8, region: "knee", exercise: "step_down_01", action: "add", rationale: "Eccentric stair prep — matches primary functional goal." },
            { session: 8, region: "shoulder", exercise: "scapular_push_up_01", action: "add", rationale: "Closed-chain scap control — progresses toward pushing tolerance." },
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
