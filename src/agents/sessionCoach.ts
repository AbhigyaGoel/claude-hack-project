import { callClaudeWithTools, type ClaudeTool } from "../lib/claude";
import type { FormAssessment, RepQuality } from "../types/assessment";
import type { SessionPhase } from "../types/session";

// --- Emotional arc types ---

type EmotionalTag =
  | "[laughs]"
  | "[sighs]"
  | "[whispers]"
  | "[firmly]"
  | "[warmly]"
  | "[calmly]"
  | "[encouragingly]"
  | "[pause]";

type ExercisePhase = "warmup" | "working" | "rest" | "cooldown";
type EffortLevel = "low" | "moderate" | "high" | "maximal";
type MusicalMode = "major" | "dorian" | "lydian";

// --- Output types ---

export interface CoachingCue {
  spoken_text: string;
  emotional_tag: EmotionalTag;
  priority: "correction" | "encouragement" | "instruction" | "praise";
  suppress_if_within_ms: number;
}

export interface MusicParams {
  key: string;
  mode: MusicalMode;
  density: number;
  reverb: number;
  bpm: number;
  bpm_multiplier: number;
}

// --- Session context for coaching decisions ---

export interface SessionContext {
  exercise_name: string;
  total_sets: number;
  total_reps: number;
  session_phase: SessionPhase;
  consecutive_green_reps: number;
  consecutive_yellow_reps: number;
  consecutive_red_reps: number;
  pain_reported_this_set: boolean;
  is_final_set: boolean;
  is_session_end: boolean;
  session_improvements: string[];
}

// --- Music parameter mapping from CLAUDE.md ---

const MUSIC_PHASE_PRESETS: Record<ExercisePhase, Omit<MusicParams, "bpm">> = {
  warmup: {
    key: "C",
    mode: "major",
    density: 0.3,
    reverb: 0.6,
    bpm_multiplier: 0.7,
  },
  working: {
    key: "D",
    mode: "dorian",
    density: 0.6,
    reverb: 0.3,
    bpm_multiplier: 1.0,
  },
  rest: {
    key: "F",
    mode: "lydian",
    density: 0.1,
    reverb: 0.8,
    bpm_multiplier: 0.5,
  },
  cooldown: {
    key: "G",
    mode: "lydian",
    density: 0.15,
    reverb: 0.9,
    bpm_multiplier: 0.6,
  },
};

// Density adjustments based on effort level
const EFFORT_DENSITY_MODIFIER: Record<EffortLevel, number> = {
  low: -0.1,
  moderate: 0.0,
  high: 0.1,
  maximal: 0.2,
};

// --- Emotional arc logic ---

function determineEmotionalTag(
  repNumber: number,
  setNumber: number,
  totalSets: number,
  repQuality: RepQuality,
  isSetComplete: boolean,
  isSessionEnd: boolean,
): EmotionalTag {
  if (isSessionEnd) return "[warmly]";
  if (isSetComplete) return "[warmly]";

  // Form break overrides arc position
  if (repQuality === "red") return "[firmly]";

  // Emotional arc by rep position
  if (repNumber <= 3) return "[encouragingly]";
  if (repNumber <= 7) {
    // Minimal intervention unless form breaks
    return repQuality === "yellow" ? "[calmly]" : "[calmly]";
  }
  // Reps 8+: fatigue zone
  return "[firmly]";
}

function determinePriority(
  repQuality: RepQuality,
  isSetComplete: boolean,
  isSessionEnd: boolean,
  coachingPriority: string | null,
): CoachingCue["priority"] {
  if (isSessionEnd) return "praise";
  if (isSetComplete) return "praise";
  if (repQuality === "red" || coachingPriority) return "correction";
  if (repQuality === "yellow") return "correction";
  return "encouragement";
}

// Suppress rapid-fire cues: corrections can fire frequently, praise less so
function determineSuppressWindow(priority: CoachingCue["priority"]): number {
  switch (priority) {
    case "correction":
      return 2000;
    case "encouragement":
      return 5000;
    case "instruction":
      return 3000;
    case "praise":
      return 0;
  }
}

// --- Claude tool definitions ---

const COACHING_CUE_TOOL: ClaudeTool = {
  name: "generate_coaching_cue",
  description:
    "Generate a spoken coaching cue with emotional tag based on form assessment, session context, and rep/set position. Returns a single concise cue the voice engine will speak aloud.",
  input_schema: {
    type: "object" as const,
    properties: {
      spoken_text: {
        type: "string",
        description:
          "The coaching cue text to be spoken. Keep under 15 words. Use second person ('you'). Be specific about the body part and correction.",
      },
      emotional_tag: {
        type: "string",
        enum: [
          "[laughs]",
          "[sighs]",
          "[whispers]",
          "[firmly]",
          "[warmly]",
          "[calmly]",
          "[encouragingly]",
          "[pause]",
        ],
        description: "ElevenLabs emotional tag to prepend to the spoken text.",
      },
      priority: {
        type: "string",
        enum: ["correction", "encouragement", "instruction", "praise"],
        description: "Cue priority category.",
      },
    },
    required: ["spoken_text", "emotional_tag", "priority"],
  },
};

const MUSIC_PARAMS_TOOL: ClaudeTool = {
  name: "update_music_params",
  description:
    "Update Tone.js music parameters based on the current exercise phase, user tempo, and effort level. Returns key, mode, density, reverb, and BPM values.",
  input_schema: {
    type: "object" as const,
    properties: {
      key: {
        type: "string",
        description: "Musical key (e.g. C, D, F, G).",
      },
      mode: {
        type: "string",
        enum: ["major", "dorian", "lydian"],
        description: "Musical mode.",
      },
      density: {
        type: "number",
        description: "Note density from 0.0 to 1.0.",
      },
      reverb: {
        type: "number",
        description: "Reverb wet amount from 0.0 to 1.0.",
      },
      bpm: {
        type: "number",
        description: "Computed BPM for Tone.js Transport.",
      },
    },
    required: ["key", "mode", "density", "reverb", "bpm"],
  },
};

// --- System prompt ---

const SESSION_COACH_SYSTEM_PROMPT = `You are Agent 4 — the Session Coach for Vero, an AI physical therapy system.

You are the voice and personality of the system. Your job is to translate clinical form assessment data into motivational, concise coaching cues that a voice engine will speak aloud to the patient during exercise.

## Rules
- All output MUST go through tool calls. Never return prose.
- Keep spoken cues under 15 words. Patients are exercising — they need short, clear guidance.
- Use second person ("you", "your").
- Be specific: name the body part, the correction, or the praise.
- Never use medical jargon. Say "shoulder blades" not "scapulae".
- If form is green, give brief encouragement or stay silent (use the suppress window).
- If form is yellow, give a calm correction cue.
- If form is red, give a firm, direct correction.
- On set completion, praise the effort and instruct rest.
- On session end, summarize improvements warmly.

## Emotional Arc
- Reps 1-3: [encouragingly] — supportive, building confidence
- Reps 4-7: [calmly] — steady, minimal intervention unless form breaks
- Reps 8+: [firmly] — direct corrections, fatigue management
- Set completion: [warmly] — praise, rest instruction
- Session end: [warmly] — summary of improvements, what to focus on next time

## Available Emotional Tags
[laughs], [sighs], [whispers], [firmly], [warmly], [calmly], [encouragingly], [pause]

You must call exactly one tool per invocation.`;

// --- Tool handlers ---

function handleGenerateCoachingCue(
  input: Record<string, unknown>,
): CoachingCue {
  const spokenText = input.spoken_text as string;
  const emotionalTag = input.emotional_tag as EmotionalTag;
  const priority = input.priority as CoachingCue["priority"];

  return {
    spoken_text: spokenText,
    emotional_tag: emotionalTag,
    priority,
    suppress_if_within_ms: determineSuppressWindow(priority),
  };
}

function handleUpdateMusicParams(input: Record<string, unknown>): MusicParams {
  const key = input.key as string;
  const mode = input.mode as MusicalMode;
  const density = Math.max(0, Math.min(1, input.density as number));
  const reverb = Math.max(0, Math.min(1, input.reverb as number));
  const bpm = Math.max(40, Math.min(200, input.bpm as number));

  return {
    key,
    mode,
    density,
    reverb,
    bpm,
    bpm_multiplier: bpm / 120, // normalized against 120 BPM baseline
  };
}

// --- Build the user message for coaching cue generation ---

function buildCoachingCuePrompt(
  formAssessment: FormAssessment,
  sessionContext: SessionContext,
  repNumber: number,
  setNumber: number,
): string {
  const emotionalTag = determineEmotionalTag(
    repNumber,
    setNumber,
    sessionContext.total_sets,
    formAssessment.rep_quality,
    repNumber === sessionContext.total_reps,
    sessionContext.is_session_end,
  );

  const priority = determinePriority(
    formAssessment.rep_quality,
    repNumber === sessionContext.total_reps,
    sessionContext.is_session_end,
    formAssessment.coaching_priority,
  );

  return JSON.stringify({
    instruction: "Generate a coaching cue using the generate_coaching_cue tool.",
    form_assessment: formAssessment,
    session_context: {
      exercise_name: sessionContext.exercise_name,
      rep_number: repNumber,
      set_number: setNumber,
      total_sets: sessionContext.total_sets,
      total_reps: sessionContext.total_reps,
      is_set_complete: repNumber === sessionContext.total_reps,
      is_final_set: sessionContext.is_final_set,
      is_session_end: sessionContext.is_session_end,
      session_improvements: sessionContext.session_improvements,
      consecutive_green_reps: sessionContext.consecutive_green_reps,
      consecutive_yellow_reps: sessionContext.consecutive_yellow_reps,
      consecutive_red_reps: sessionContext.consecutive_red_reps,
      pain_reported_this_set: sessionContext.pain_reported_this_set,
    },
    suggested_emotional_tag: emotionalTag,
    suggested_priority: priority,
  });
}

// --- Build the user message for music parameter updates ---

function buildMusicParamsPrompt(
  exercisePhase: ExercisePhase,
  userTempoBpm: number,
  effortLevel: EffortLevel,
): string {
  const preset = MUSIC_PHASE_PRESETS[exercisePhase];
  const baseBpm = userTempoBpm * preset.bpm_multiplier;
  const adjustedDensity = Math.max(
    0,
    Math.min(1, preset.density + EFFORT_DENSITY_MODIFIER[effortLevel]),
  );

  return JSON.stringify({
    instruction:
      "Update music parameters using the update_music_params tool. Use the suggested values as a baseline but adjust based on the context.",
    exercise_phase: exercisePhase,
    user_tempo_bpm: userTempoBpm,
    effort_level: effortLevel,
    suggested_params: {
      key: preset.key,
      mode: preset.mode,
      density: adjustedDensity,
      reverb: preset.reverb,
      bpm: Math.round(baseBpm),
    },
  });
}

// --- Public API ---

export async function generateCoachingCue(
  formAssessment: FormAssessment,
  sessionContext: SessionContext,
  repNumber: number,
  setNumber: number,
): Promise<CoachingCue> {
  const userMessage = buildCoachingCuePrompt(
    formAssessment,
    sessionContext,
    repNumber,
    setNumber,
  );

  const { toolResults } = await callClaudeWithTools(
    SESSION_COACH_SYSTEM_PROMPT,
    [{ role: "user", content: userMessage }],
    [COACHING_CUE_TOOL],
    {
      generate_coaching_cue: async (input) =>
        handleGenerateCoachingCue(input),
    },
  );

  if (toolResults.length === 0) {
    // Fallback: produce a neutral encouragement cue
    return {
      spoken_text: "Keep going, you're doing well.",
      emotional_tag: "[encouragingly]",
      priority: "encouragement",
      suppress_if_within_ms: 5000,
    };
  }

  return toolResults[0] as CoachingCue;
}

export async function updateMusicParams(
  exercisePhase: ExercisePhase,
  userTempoBpm: number,
  effortLevel: EffortLevel,
): Promise<MusicParams> {
  const userMessage = buildMusicParamsPrompt(
    exercisePhase,
    userTempoBpm,
    effortLevel,
  );

  const { toolResults } = await callClaudeWithTools(
    SESSION_COACH_SYSTEM_PROMPT,
    [{ role: "user", content: userMessage }],
    [MUSIC_PARAMS_TOOL],
    {
      update_music_params: async (input) =>
        handleUpdateMusicParams(input),
    },
  );

  if (toolResults.length === 0) {
    // Fallback: return the phase preset directly
    const preset = MUSIC_PHASE_PRESETS[exercisePhase];
    const baseBpm = Math.round(userTempoBpm * preset.bpm_multiplier);
    return {
      key: preset.key,
      mode: preset.mode,
      density: preset.density,
      reverb: preset.reverb,
      bpm: baseBpm,
      bpm_multiplier: preset.bpm_multiplier,
    };
  }

  return toolResults[0] as MusicParams;
}

// --- Convenience: compute music params locally without Claude call ---

export function computeMusicParamsLocal(
  exercisePhase: ExercisePhase,
  userTempoBpm: number,
  effortLevel: EffortLevel,
): MusicParams {
  const preset = MUSIC_PHASE_PRESETS[exercisePhase];
  const adjustedDensity = Math.max(
    0,
    Math.min(1, preset.density + EFFORT_DENSITY_MODIFIER[effortLevel]),
  );
  const bpm = Math.round(userTempoBpm * preset.bpm_multiplier);

  return {
    key: preset.key,
    mode: preset.mode,
    density: adjustedDensity,
    reverb: preset.reverb,
    bpm,
    bpm_multiplier: preset.bpm_multiplier,
  };
}
