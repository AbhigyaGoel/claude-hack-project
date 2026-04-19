import type { DiagnosticResult } from "./patient";

/**
 * API response shape for a patient. Replaces the former localStorage
 * `StoredProfile` — same keys as before plus a server-owned id.
 */
export interface PatientRecord {
  id: string;
  name: string;
  /** Full profile JSON persisted in `patients.profile_json`. */
  profile: { name?: string; diagnostic?: DiagnosticResult | null } | null;
  created_at: string | null;
  session_count: number;
}

export interface ExerciseResult {
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  form_score: number | null;
}

/**
 * API response shape for a session. Replaces the former localStorage
 * `StoredSession`. `patient_id` replaces the former `profile_id`.
 */
export interface SessionRecord {
  id: string;
  patient_id: string;
  session_number: number;
  date: string | null;
  duration_minutes: number;
  pain_pre: number;
  pain_post: number;
  total_reps: number;
  avg_form_quality: number;
  exercises: ExerciseResult[];
  summary: Record<string, unknown> | null;
}

// Legacy aliases kept only so unchanged helpers compile while migration
// settles. New code should import PatientRecord / SessionRecord instead.
export type StoredProfile = PatientRecord & {
  diagnostic: DiagnosticResult;
  updated_at: string;
};
export type StoredSession = SessionRecord & {
  profile_id: string;
};
export interface StoredExerciseResult {
  exercise_id: string;
  exercise_name: string;
  sets_completed: number;
  sets_prescribed: number;
  reps_per_set: number[];
  form_quality_pct: number;
  peak_angles: Record<string, number>;
  target_angles: Record<string, number>;
  compensations: string[];
}
