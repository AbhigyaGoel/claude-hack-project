import type { ToolDef } from "./client";

/**
 * Server-side tool registry — single source of truth for all tool definitions.
 */

export const TOOLS: Record<string, ToolDef> = {
  capture_pose_frame: {
    name: "capture_pose_frame",
    description: "Capture the current webcam frame with MediaPipe keypoints. Returns keypoint array and JPEG base64.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  vision_analyze: {
    name: "vision_analyze",
    description: "Analyze a webcam frame using Claude Vision. Detects compensations not visible from keypoints alone: grimacing, breath-holding, bracing, shoulder hike, asymmetric loading, equipment misuse.",
    input_schema: {
      type: "object" as const,
      properties: {
        frame_base64: { type: "string", description: "JPEG frame as base64" },
        keypoints_json: { type: "string", description: "MediaPipe keypoints as JSON" },
        exercise_context: { type: "string", description: "Current exercise name and cues" },
      },
      required: ["frame_base64"],
    },
  },

  speak: {
    name: "speak",
    description: "Speak text to the patient via ElevenLabs TTS with emotional conditioning.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to speak (max 15 words)" },
        emotion: { type: "string", enum: ["calm", "encouraging", "urgent"], description: "Emotional tone" },
        priority: { type: "number", description: "1-5, higher preempts lower" },
      },
      required: ["text", "emotion"],
    },
  },

  set_music_tempo: {
    name: "set_music_tempo",
    description: "Adjust the Tone.js music BPM. Used to match patient movement cadence or signal phase changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        bpm: { type: "number", description: "Target BPM" },
        phase: { type: "string", enum: ["warmup", "working", "rest", "cooldown"] },
      },
      required: ["bpm"],
    },
  },

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
    description: "Advance exercise difficulty. Used when form quality consistently > 85%.",
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
    description: "Reduce exercise difficulty / deload. Used when severity >= 4 or pain reported.",
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
    description: "Halt session immediately. Patient reported a red-flag symptom (radiating pain, loss of control, etc). Refer to human PT.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", description: "Red flag classification" },
        transcript: { type: "string", description: "What the patient said" },
      },
      required: ["type"],
    },
  },

  query_history: {
    name: "query_history",
    description: "Query prior session data for a patient. Returns session deltas, ROM trends, pain trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_id: { type: "string" },
        last_n_sessions: { type: "number", description: "Number of recent sessions to return" },
      },
      required: ["patient_id"],
    },
  },

  generate_report: {
    name: "generate_report",
    description: "Generate a session summary report with metrics, charts, and recommendations. Output as structured JSON for PDF rendering.",
    input_schema: {
      type: "object" as const,
      properties: {
        session_id: { type: "string" },
        include_charts: { type: "boolean" },
      },
      required: ["session_id"],
    },
  },
};

/** Get tools by name for a specific agent context */
export function getTools(...names: string[]): ToolDef[] {
  return names.map((n) => TOOLS[n]).filter(Boolean);
}
