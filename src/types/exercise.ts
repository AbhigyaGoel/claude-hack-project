export type BodyRegion = "shoulder" | "knee" | "hip" | "ankle" | "lumbar" | "cervical";
export type ExerciseCategory = "mobility" | "strengthening" | "stabilization" | "stretching";
export type DifficultyTier = 1 | 2 | 3 | 4 | 5;

export interface CompensationPattern {
  name: string;
  detection: string;
  landmarks: number[];
  severity: "yellow" | "red";
}

export interface Exercise {
  id: string;
  name: string;
  body_region: BodyRegion;
  category: ExerciseCategory;
  difficulty_tier: DifficultyTier;
  equipment: string[];
  target_muscles: string[];
  primary_joint_angle: string;
  target_angles: Record<string, number>;
  tolerances: Record<string, number>;
  tempo_seconds: string; // eccentric-pause-concentric-pause
  default_sets: number;
  default_reps: number;
  cues: string[];
  compensation_patterns: CompensationPattern[];
  contraindications: string[];
  regression: string;
  progression: string;
}

export interface ExercisePlanItem {
  id: string;
  name: string;
  target_muscles: string[];
  target_angles: Record<string, number>;
  tolerances: Record<string, number>;
  tempo_seconds: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  cues: string[];
  compensation_patterns: CompensationPattern[];
  regression: string;
  progression: string;
}

export interface ExercisePlan {
  session_number: number;
  estimated_duration_minutes: number;
  exercises: ExercisePlanItem[];
}
