import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * App users — simple username/password auth, separate from Supabase Auth.
 * Security is not a concern for the demo, so the password column holds the
 * value as the user typed it.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Patient"),
  profile_json: jsonb("profile_json").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  patient_id: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  plan_json: jsonb("plan_json").notNull(),
  active: boolean("active").notNull().default(true),
  citations_json: jsonb("citations_json"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // plan_id is nullable so sessions can be persisted before a server plan is
  // generated (e.g., the current client-side quick-plan path in /session).
  plan_id: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  patient_id: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  started_at: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  ended_at: timestamp("ended_at", { withTimezone: true }),
  pain_pre: integer("pain_pre"),
  pain_post: integer("pain_post"),
  summary_json: jsonb("summary_json"),
  artifact_url: text("artifact_url"),
});

export const sets = pgTable(
  "sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    session_id: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    exercise_id: text("exercise_id").notNull(),
    exercise_name: text("exercise_name").notNull(),
    set_number: integer("set_number").notNull(),
    reps: integer("reps").notNull().default(0),
    rpe: doublePrecision("rpe"),
    pain: integer("pain"),
    form_score: doublePrecision("form_score"),
  },
  (t) => ({
    naturalKey: uniqueIndex("sets_session_exercise_set_unique").on(
      t.session_id,
      t.exercise_id,
      t.set_number,
    ),
  }),
);

export const repAnalyses = pgTable("rep_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  set_id: uuid("set_id").notNull().references(() => sets.id, { onDelete: "cascade" }),
  rep_num: integer("rep_num").notNull(),
  video_clip_url: text("video_clip_url"),
  faults_json: jsonb("faults_json"),
  quality: doublePrecision("quality"),
});

export const formEvents = pgTable("form_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  set_id: uuid("set_id").notNull().references(() => sets.id, { onDelete: "cascade" }),
  t_ms: integer("t_ms").notNull(),
  fault: text("fault").notNull(),
  severity: integer("severity").notNull(),
  cue_sent: text("cue_sent"),
});

export const redFlags = pgTable("red_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  transcript: text("transcript"),
  halted: boolean("halted").notNull().default(false),
  referred: boolean("referred").notNull().default(false),
});

/**
 * Narrator log — canonical record of everything Claude says or decides in a
 * PT role. Populated by intake, plan, chat, session report, and (when
 * reintroduced) real-time rep analysis. Chat RAG reads the recent N rows
 * here as part of patient context.
 *
 * `session_id` is nullable so commentary that isn't tied to a live session
 * (intake, cross-session chat, plan rationale) can still be captured.
 */
export const narratorLog = pgTable("narrator_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  patient_id: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  session_id: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // "intake" | "plan" | "chat" | "report" | "rep_analysis" | "narrator" | "safety"
  t_ms: integer("t_ms").notNull().default(0),
  reasoning_text: text("reasoning_text").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  patient_id: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Patient memory — Claude's curated per-patient notes, one row per
 * (patient, filename). Replaces the filesystem-based patient-memory/ tree.
 */
export const patientMemory = pgTable(
  "patient_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patient_id: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    content: text("content").notNull().default(""),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    patientFilename: uniqueIndex("patient_memory_patient_filename_unique").on(
      t.patient_id,
      t.filename,
    ),
  }),
);
