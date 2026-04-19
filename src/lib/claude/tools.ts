import type { ToolDef } from "./client";

/**
 * Server-side tool registry — single source of truth.
 * Tools are grouped by agent context.
 */

export const TOOLS: Record<string, ToolDef> = {
  // --- Pose & Vision ---
  capture_pose_frame: {
    name: "capture_pose_frame",
    description: "Capture current webcam frame with MediaPipe keypoints. Returns keypoint array + JPEG base64.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  pose_special_test: {
    name: "pose_special_test",
    description: "Execute a specific pose-based special test (e.g., Hawkins-Kennedy). Instructs patient, captures pose, analyzes result.",
    input_schema: {
      type: "object" as const,
      properties: {
        test_name: { type: "string", description: "Name of the special test" },
        instructions: { type: "string", description: "Patient instructions" },
        measurement_joints: { type: "array", items: { type: "string" }, description: "Joints to measure" },
      },
      required: ["test_name", "instructions"],
    },
  },
  vision_analyze: {
    name: "vision_analyze",
    description: "Analyze a webcam frame using Claude Vision for faults keypoints miss: grimacing, breath-holding, compensatory patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        frame_base64: { type: "string" },
        keypoints_json: { type: "string" },
        exercise_context: { type: "string" },
      },
      required: ["frame_base64"],
    },
  },

  // --- Voice & Audio ---
  speak: {
    name: "speak",
    description: "Speak text to patient via ElevenLabs TTS with emotional conditioning.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to speak (max 15 words)" },
        emotion: { type: "string", enum: ["calm", "encouraging", "urgent"] },
        priority: { type: "number", description: "1-5, higher preempts lower" },
        interrupt_current: { type: "boolean", description: "If true, stop current speech" },
      },
      required: ["text", "emotion"],
    },
  },
  play_cue: {
    name: "play_cue",
    description: "Play a pre-baked audio cue (countdown, completion chime, alert).",
    input_schema: {
      type: "object" as const,
      properties: {
        cue_type: { type: "string", enum: ["countdown_3", "rep_complete", "set_complete", "session_end", "alert"] },
      },
      required: ["cue_type"],
    },
  },

  // --- Session Management ---
  log_rep: {
    name: "log_rep",
    description: "Log a completed rep with quality metrics to the database.",
    input_schema: {
      type: "object" as const,
      properties: {
        exercise_id: { type: "string" },
        rep_number: { type: "number" },
        quality: { type: "string", enum: ["green", "yellow", "red"] },
        peak_angle: { type: "number" },
        target_angle: { type: "number" },
        faults: { type: "array", items: { type: "string" } },
        pain_reported: { type: "boolean" },
      },
      required: ["exercise_id", "rep_number", "quality"],
    },
  },
  progress_exercise: {
    name: "progress_exercise",
    description: "Advance exercise difficulty. Use when form quality consistently > 85%.",
    input_schema: {
      type: "object" as const,
      properties: {
        exercise_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["exercise_id", "reason"],
    },
  },
  regress_exercise: {
    name: "regress_exercise",
    description: "Reduce exercise difficulty/deload. Use when severity >= 4 or pain reported.",
    input_schema: {
      type: "object" as const,
      properties: {
        exercise_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["exercise_id", "reason"],
    },
  },
  flag_red_flag: {
    name: "flag_red_flag",
    description: "HALT session immediately. Red-flag symptom detected. Refer to human PT.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", description: "Red flag classification" },
        transcript: { type: "string" },
      },
      required: ["type"],
    },
  },

  // --- Data & History ---
  query_history: {
    name: "query_history",
    description: "Query prior session data for trends, ROM deltas, pain trajectory.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_id: { type: "string" },
        last_n_sessions: { type: "number" },
      },
      required: ["patient_id"],
    },
  },
  generate_report: {
    name: "generate_report",
    description: "Generate session summary report with metrics and recommendations. Output structured JSON for artifact rendering.",
    input_schema: {
      type: "object" as const,
      properties: {
        session_id: { type: "string" },
        include_charts: { type: "boolean" },
        include_narrative: { type: "boolean" },
      },
      required: ["session_id"],
    },
  },
  get_health_data: {
    name: "get_health_data",
    description: "Fetch health data from MCP Apple Health / Google Fit connector.",
    input_schema: {
      type: "object" as const,
      properties: {
        data_type: { type: "string", enum: ["steps", "sleep", "heart_rate", "activity"] },
        days: { type: "number" },
      },
      required: ["data_type"],
    },
  },
};

/** Get tools by name for a specific agent context */
export function getTools(...names: string[]): ToolDef[] {
  return names.map((n) => TOOLS[n]).filter(Boolean);
}

/** Orchestrator tools — full set */
export const ORCHESTRATOR_TOOLS = getTools(
  "speak", "play_cue",
  "log_rep", "progress_exercise", "regress_exercise", "flag_red_flag",
  "query_history",
);

/** Form critic tools */
export const FORM_CRITIC_TOOLS = getTools("log_rep", "regress_exercise");

/** Intake tools */
export const INTAKE_TOOLS = getTools("pose_special_test", "speak");

/** Report tools */
export const REPORT_TOOLS = getTools("generate_report", "query_history");
