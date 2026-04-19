import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  profile_json: text("profile_json").notNull(),
  memory_path: text("memory_path").notNull(),
  created_at: text("created_at").notNull(),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  patient_id: text("patient_id").notNull().references(() => patients.id),
  plan_json: text("plan_json").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  citations_json: text("citations_json"),
  created_at: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  plan_id: text("plan_id").notNull().references(() => plans.id),
  patient_id: text("patient_id").notNull().references(() => patients.id),
  started_at: text("started_at").notNull(),
  ended_at: text("ended_at"),
  pain_pre: integer("pain_pre"),
  pain_post: integer("pain_post"),
  summary_json: text("summary_json"),
  artifact_url: text("artifact_url"),
});

export const sets = sqliteTable("sets", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull().references(() => sessions.id),
  exercise_id: text("exercise_id").notNull(),
  exercise_name: text("exercise_name").notNull(),
  set_number: integer("set_number").notNull(),
  reps: integer("reps").notNull().default(0),
  rpe: real("rpe"),
  pain: integer("pain"),
  form_score: real("form_score"),
});

export const repAnalyses = sqliteTable("rep_analyses", {
  id: text("id").primaryKey(),
  set_id: text("set_id").notNull().references(() => sets.id),
  rep_num: integer("rep_num").notNull(),
  video_clip_url: text("video_clip_url"),
  faults_json: text("faults_json"),
  quality: real("quality"),
});

export const formEvents = sqliteTable("form_events", {
  id: text("id").primaryKey(),
  set_id: text("set_id").notNull().references(() => sets.id),
  t_ms: integer("t_ms").notNull(),
  fault: text("fault").notNull(),
  severity: integer("severity").notNull(),
  cue_sent: text("cue_sent"),
});

export const redFlags = sqliteTable("red_flags", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull().references(() => sessions.id),
  type: text("type").notNull(),
  transcript: text("transcript"),
  halted: integer("halted", { mode: "boolean" }).notNull().default(false),
  referred: integer("referred", { mode: "boolean" }).notNull().default(false),
});

export const narratorLog = sqliteTable("narrator_log", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull().references(() => sessions.id),
  t_ms: integer("t_ms").notNull(),
  reasoning_text: text("reasoning_text").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  patient_id: text("patient_id").notNull().references(() => patients.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  created_at: text("created_at").notNull(),
});
