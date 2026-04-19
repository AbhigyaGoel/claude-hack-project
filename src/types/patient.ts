import type { BodyRegion } from "./exercise";

export type Side = "left" | "right" | "bilateral";

export interface DiagnosticResult {
  body_region: BodyRegion;
  side: Side;
  onset: string;
  mechanism: string;
  severity_score: number;
  instrument_used: string;
  functional_deficits: string[];
  contraindications: string[];
  red_flags: string[];
  cleared_for_exercise: boolean;
}

export interface PatientProfile {
  id: string;
  diagnostic: DiagnosticResult;
  session_count: number;
  created_at: string;
  updated_at: string;
}
