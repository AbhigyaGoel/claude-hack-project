import type { PatientProfile } from "./patient";
import type { ExercisePlan } from "./exercise";
import type { FormAssessment } from "./assessment";

export type SessionPhase = "intake" | "exercise" | "rest" | "cooldown" | "summary";

export interface SessionState {
  phase: SessionPhase;
  patient: PatientProfile | null;
  plan: ExercisePlan | null;
  current_exercise_index: number;
  current_set: number;
  current_rep: number;
  assessments: FormAssessment[];
  started_at: string | null;
  ended_at: string | null;
}

export interface SessionData {
  session_id: string;
  patient_id: string;
  session_number: number;
  date: string;
  pain_pre: number;
  pain_post: number;
  exercises_completed: number;
  exercises_prescribed: number;
  state: SessionState;
}
