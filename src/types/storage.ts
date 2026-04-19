import type { DiagnosticResult } from "./patient";

export interface StoredProfile {
  id: string;
  name: string;
  diagnostic: DiagnosticResult;
  created_at: string;
  updated_at: string;
  session_count: number;
}

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

export interface StoredSession {
  id: string;
  profile_id: string;
  session_number: number;
  date: string;
  duration_minutes: number;
  pain_pre: number;
  pain_post: number;
  exercises: StoredExerciseResult[];
  total_reps: number;
  avg_form_quality: number;
}
