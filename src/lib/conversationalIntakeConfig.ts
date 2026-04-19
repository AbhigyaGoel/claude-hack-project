/** ElevenLabs Conversational AI agent config for PT intake. */

export const INTAKE_AGENT_NAME = "Vero PT Intake";

export const INTAKE_FIRST_MESSAGE =
  "Hey, I'm Vero! Just describe what's going on — where it hurts, how long it's been, and how bad it is. I'll handle the rest.";

export const INTAKE_SYSTEM_PROMPT = `You are Vero, an AI physical therapy assistant doing a fast intake. Your entire job is to listen to one free-form description from the patient and immediately call complete_assessment with everything you can extract from it.

## The flow — maximum 2 exchanges

### Turn 1
Your first message is already set. The patient will respond with a description.

### Turn 2 (after they speak)
Extract everything you can from what they said. Call complete_assessment immediately. Do not ask follow-up questions unless the body region is completely unidentifiable — in that case, ask ONE clarifying question only: "Which part specifically — shoulder, knee, hip, ankle, back, or neck?"

After calling complete_assessment, say: "Got it — I've pre-filled the form based on what you told me. Review it and tap continue when you're ready."

## What to extract from their description

**body_region** — pick from: shoulder, knee, hip, ankle, lumbar, cervical. Infer from context ("my back" → lumbar, "my neck" → cervical, "my leg" could be knee or hip based on what they say).

**side** — left/right/bilateral. Infer from "my right shoulder", "both knees", etc. Default to "bilateral" if unclear.

**onset** — duration. Map to: "less than 1 week", "1-2 weeks", "2-4 weeks", "1-3 months", "more than 3 months". "a couple weeks" → "1-2 weeks", "a few months" → "1-3 months", etc.

**mechanism** — what caused it. Map to: "Overhead lifting", "Repetitive motion", "Fall or impact", "Gradual onset", "Unknown". "I fell" → "Fall or impact", "been building up" → "Gradual onset", etc.

**pain_level** — 0-10 numeric. Infer from language: "a little sore" → 3, "pretty painful" → 6, "hard to use" → 7, "really bad" → 8, "constant sharp" → 9. Default to 5 if not mentioned.

**red_flags** — only include if explicitly mentioned. Options: "numbness_tingling", "bowel_bladder_changes", "night_pain", "fever", "significant_trauma", "unexplained_weight_loss". Do NOT prompt for these — only capture if the patient brings them up.

**functional_responses** — limitations they mention. Capture as key/value pairs:
- overhead: "None" | "Mild" | "Moderate" | "Severe" | "Unable"
- carrying: "None" | "Mild" | "Moderate" | "Severe" | "Unable"
- dressing: "None" | "Mild" | "Moderate" | "Severe" | "Unable"
- stairs: "None" | "Mild" | "Moderate" | "Severe" | "Unable"
- squatting: "None" | "Mild" | "Moderate" | "Severe" | "Unable"
- walking: "None" | "Mild" | "Moderate" | "Severe" | "Unable"

## Rules
- One tool call: complete_assessment. That's it.
- Do NOT call record_body_region or record_red_flags separately.
- Do NOT ask about red flags explicitly — only capture what they mention.
- Do NOT go question by question.
- If pain_level is not mentioned, default to 5.
- If side is not mentioned, default to "bilateral".
- Make your best inference. A slightly wrong answer the user can correct in 2 seconds is better than a long conversation.`;

/** Client-side tool schemas — must match what's registered in clientTools on the frontend. */
export const INTAKE_AGENT_TOOLS = [
  {
    type: "client",
    name: "record_body_region",
    description: "Record the body region the patient has identified as the problem area.",
    parameters: {
      type: "object",
      properties: {
        region: {
          type: "string",
          enum: ["shoulder", "knee", "hip", "ankle", "lumbar", "cervical"],
          description: "The affected body region",
        },
      },
      required: ["region"],
    },
  },
  {
    type: "client",
    name: "record_red_flags",
    description: "Record red flag screening results. Call with empty flags array if all clear.",
    parameters: {
      type: "object",
      properties: {
        flags: {
          type: "array",
          description: "Detected red flags, e.g. ['numbness_tingling', 'night_pain']. Empty array if all clear.",
          items: { type: "string", description: "A red flag identifier such as numbness_tingling or night_pain" },
        },
      },
      required: ["flags"],
    },
  },
  {
    type: "client",
    name: "complete_assessment",
    description: "Call this when the full functional assessment is collected. Triggers plan generation.",
    parameters: {
      type: "object",
      properties: {
        body_region: { type: "string", description: "The affected body region: shoulder, knee, hip, ankle, lumbar, or cervical" },
        side: { type: "string", enum: ["left", "right", "bilateral"], description: "Which side is affected" },
        onset: { type: "string", description: "When the pain started, e.g. less than 1 week, 1-4 weeks, 1-3 months, over 3 months" },
        mechanism: { type: "string", description: "What caused the pain, e.g. overhead lifting, fall, gradual onset, unknown" },
        pain_level: { type: "number", description: "Current pain level on a 0 to 10 scale" },
        functional_responses: {
          type: "object",
          description: "Key/value pairs of functional assessment question IDs to patient responses",
        },
        red_flags: {
          type: "array",
          description: "Red flags the patient explicitly mentioned (e.g. numbness_tingling, night_pain). Omit if none mentioned.",
          items: { type: "string", description: "A red flag identifier such as numbness_tingling, night_pain, or significant_trauma" },
        },
      },
      required: ["body_region", "side", "onset", "pain_level"],
    },
  },
];

/** Map of red_flag identifiers to their IntakeView form field answers */
export const RED_FLAG_ID_TO_RESPONSE: Record<string, { field: string; value: string }> = {
  numbness_tingling:        { field: "numbness",      value: "Yes" },
  bowel_bladder_changes:    { field: "bowel_bladder", value: "Yes" },
  night_pain:               { field: "night_pain",    value: "Yes" },
  fever:                    { field: "fever",          value: "Yes" },
  significant_trauma:       { field: "trauma",         value: "Yes — significant" },
  minor_trauma:             { field: "trauma",         value: "Yes — minor" },
  unexplained_weight_loss:  { field: "weight_loss",   value: "Yes" },
};

/** ElevenLabs agent creation payload. */
export function buildAgentPayload() {
  return {
    name: INTAKE_AGENT_NAME,
    conversation_config: {
      agent: {
        prompt: {
          prompt: INTAKE_SYSTEM_PROMPT,
          tools: INTAKE_AGENT_TOOLS,
        },
        first_message: INTAKE_FIRST_MESSAGE,
        language: "en",
      },
      tts: {
        voice_id: "nPczCjzI2devNBz1zQrb", // Brian — deep, warm, narrative male
        model_id: "eleven_turbo_v2",
      },
    },
  };
}
