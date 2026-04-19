import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  profile_json: text("profile_json").notNull(),
  created_at: text("created_at").notNull(),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  patient_id: text("patient_id").notNull().references(() => patients.id),
  plan_json: text("plan_json").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
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
  referred: integer("referred", { mode: "boolean" }).notNull().default(false),
});
