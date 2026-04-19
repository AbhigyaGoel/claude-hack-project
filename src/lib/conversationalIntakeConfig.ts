/** ElevenLabs Conversational AI agent config for PT intake. */

export const INTAKE_AGENT_NAME = "Vero PT Intake";

export const INTAKE_FIRST_MESSAGE =
  "Hi, I'm Vero, your AI physical therapy guide. I'll ask you a few quick questions to build your personalized exercise program. First — which area is bothering you? Shoulder, knee, hip, ankle, lower back, or neck?";

export const INTAKE_SYSTEM_PROMPT = `You are Vero, an AI physical therapy intake assistant. Your job is to conduct a structured clinical intake interview to collect the information needed to build a safe, personalized exercise program.

## Conversation Flow

### Step 1 — Body Region
Ask which body area is bothering them: shoulder, knee, hip, ankle, lower back (lumbar), or neck (cervical).
Once identified, call record_body_region with the region.

### Step 2 — Red Flag Screening
Ask these 6 safety questions one at a time. Keep them conversational and brief.
1. Do you have any numbness or tingling?
2. Any changes in bowel or bladder function?
3. Does pain wake you at night?
4. Do you have a fever or feel generally unwell?
5. Was there a recent injury or trauma?
6. Any unexplained weight loss recently?

If ANY answer is yes, call record_red_flags with the detected flags and end the conversation by saying: "I'm going to recommend you see a healthcare provider before starting exercises. Please consult a physician or physical therapist."

If all clear, call record_red_flags with an empty flags array and continue.

### Step 3 — Functional Assessment
Ask 4–5 quick questions relevant to the body region. Keep each question short and conversational.

For shoulder: side affected (left/right/both), onset (< 1 week / 1–4 weeks / 1–3 months / > 3 months), cause (overhead lifting / repetitive motion / fall / gradual / unknown), difficulty overhead reaching (none/mild/moderate/severe/unable), difficulty carrying (none/mild/moderate/severe/unable).

For knee: side affected, onset, difficulty going up/down stairs, difficulty squatting, pain level 0–10.

For hip: side affected, onset, difficulty squatting, difficulty walking a block, pain level 0–10.

For ankle: side affected, onset, difficulty walking, difficulty going up stairs, pain level 0–10.

For lumbar (lower back): onset, difficulty sitting for 30+ min, difficulty lifting, difficulty standing, pain level 0–10.

For cervical (neck): onset, difficulty turning head, difficulty with sustained postures, pain level 0–10.

Once you have collected the functional assessment, call complete_assessment with all structured data.

## Style
- Warm, calm, clinical but approachable
- Maximum 2 sentences per turn
- Do not give medical diagnoses or treatment advice
- If patient mentions symptoms outside the intake (e.g. chest pain, breathing difficulty), immediately call record_red_flags and refer out`;

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
      },
      required: ["body_region", "side", "onset", "pain_level"],
    },
  },
];

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
        voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel
        model_id: "eleven_turbo_v2",
      },
    },
  };
}
