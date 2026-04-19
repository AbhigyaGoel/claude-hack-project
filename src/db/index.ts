import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "vero.db");

let _db: ReturnType<typeof drizzle> | null = null;

const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    profile_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    plan_json TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id),
    patient_id TEXT NOT NULL REFERENCES patients(id),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    pain_pre INTEGER,
    pain_post INTEGER,
    summary_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    exercise_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL DEFAULT 0,
    rpe REAL,
    pain INTEGER,
    form_score REAL
  )`,
  `CREATE TABLE IF NOT EXISTS form_events (
    id TEXT PRIMARY KEY,
    set_id TEXT NOT NULL REFERENCES sets(id),
    t_ms INTEGER NOT NULL,
    fault TEXT NOT NULL,
    severity INTEGER NOT NULL,
    cue_sent TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS red_flags (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    type TEXT NOT NULL,
    transcript TEXT,
    referred INTEGER NOT NULL DEFAULT 0
  )`,
];

export function getDb() {
  if (!_db) {
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema });

    for (const sql of CREATE_TABLES_SQL) {
      sqlite.prepare(sql).run();
    }
  }
  return _db;
}
