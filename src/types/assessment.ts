export type RepQuality = "green" | "yellow" | "red";
export type TempoAssessment = "on_tempo" | "too_fast" | "too_slow";
export type CorrectionType = "rom_deficit" | "rom_excess" | "compensation";

export interface RepData {
  exercise_id: string;
  rep_number: number;
  peak_angles: Record<string, number>;
  rep_duration_ms: number;
  target_tempo_ms: number;
  compensation_flags: string[];
  pain_reported: boolean;
}

export interface Deviation {
  joint: string;
  actual: number;
  target: number;
  deficit: number;
  severity: RepQuality;
  correction_type: CorrectionType;
}

export interface FormAssessment {
  rep_quality: RepQuality;
  deviations: Deviation[];
  compensations_detected: string[];
  coaching_priority: string | null;
  rep_counted: boolean;
  tempo_assessment: TempoAssessment;
}
