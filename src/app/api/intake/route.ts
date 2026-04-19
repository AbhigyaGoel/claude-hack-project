import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { INTAKE_SYSTEM } from "@/lib/claude/prompts";
import { getDb } from "@/db";
import { patients } from "@/db/schema";

const SCREENING_INSTRUMENTS: Record<string, { name: string; questions: string[] }> = {
  shoulder: {
    name: "DASH",
    questions: [
      "Rate difficulty opening a tight jar (1-5)",
      "Rate difficulty doing heavy chores like washing walls (1-5)",
      "Rate difficulty carrying a shopping bag (1-5)",
      "Rate difficulty washing your back (1-5)",
      "Rate your arm/shoulder pain during activity (1-5)",
      "Rate stiffness in your arm/shoulder (1-5)",
    ],
  },
  knee: {
    name: "KOOS",
    questions: [
      "How often do you experience knee pain? (never to always)",
      "Rate pain going up/down stairs (0-10)",
      "Rate difficulty squatting (0-4)",
      "Rate difficulty running (0-4)",
      "Rate knee stiffness in the morning (0-10)",
      "How much does your knee affect daily life? (0-10)",
    ],
  },
  lumbar: {
    name: "ODI",
    questions: [
      "Rate your pain intensity (0-5)",
      "Rate difficulty with personal care/washing (0-5)",
      "Rate difficulty lifting (0-5)",
      "Rate difficulty walking (0-5)",
      "Rate difficulty sitting (0-5)",
      "Rate difficulty standing (0-5)",
    ],
  },
  hip: {
    name: "LEFS",
    questions: [
      "Rate difficulty with usual work/housework (0-4)",
      "Rate difficulty squatting (0-4)",
      "Rate difficulty walking a block (0-4)",
      "Rate difficulty going up stairs (0-4)",
      "Rate difficulty running on uneven ground (0-4)",
      "Rate difficulty getting in/out of bath (0-4)",
    ],
  },
  cervical: {
    name: "NDI",
    questions: [
      "Rate your neck pain intensity (0-5)",
      "Rate difficulty with personal care (0-5)",
      "Rate difficulty lifting (0-5)",
      "Rate difficulty reading (0-5)",
      "Rate difficulty with headaches (0-5)",
      "Rate difficulty concentrating (0-5)",
    ],
  },
  ankle: {
    name: "LEFS",
    questions: [
      "Rate difficulty walking a block (0-4)",
      "Rate difficulty going up 10 stairs (0-4)",
      "Rate difficulty squatting (0-4)",
      "Rate difficulty running on even ground (0-4)",
      "Rate difficulty with hopping (0-4)",
      "Rate difficulty standing for 1 hour (0-4)",
    ],
  },
};

const RED_FLAG_INDICATORS = [
  "numbness", "tingling", "bowel", "bladder", "saddle",
  "night pain", "fever", "weight loss", "weakness", "progressive",
  "trauma", "cancer",
];

const tools = [
  {
    name: "generate_screening_instrument",
    description: "Generate region-specific screening questions",
    input_schema: {
      type: "object" as const,
      properties: {
        body_region: { type: "string" },
      },
      required: ["body_region"],
    },
  },
  {
    name: "score_instrument",
    description: "Score a completed screening instrument and classify severity",
    input_schema: {
      type: "object" as const,
      properties: {
        instrument: { type: "string" },
        responses: { type: "object" },
      },
      required: ["instrument", "responses"],
    },
  },
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bodyRegion, responses, patientName } = body;

  const instrument = SCREENING_INSTRUMENTS[bodyRegion] ?? SCREENING_INSTRUMENTS.shoulder;

  // Detect red flags
  const responseText = JSON.stringify(responses).toLowerCase();
  const detectedRedFlags = RED_FLAG_INDICATORS.filter((flag) =>
    responseText.includes(flag)
  );

  // Score severity from responses
  const numericValues = Object.values(responses as Record<string, string>)
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n));
  const avgScore = numericValues.length > 0
    ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
    : 3;
  const maxPossible = bodyRegion === "lumbar" || bodyRegion === "cervical" ? 5 : 4;
  const severityPct = Math.round((avgScore / maxPossible) * 100);

  const clearedForExercise = detectedRedFlags.length === 0 && severityPct < 80;

  // Use Claude for deeper analysis with extended thinking
  let claudeAnalysis = "";
  try {
    const result = await callClaude({
      model: "claude-opus-4-7-20250219",
      system: INTAKE_SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            body_region: bodyRegion,
            instrument_used: instrument.name,
            responses,
            detected_red_flags: detectedRedFlags,
            severity_pct: severityPct,
          }),
        },
      ],
      tools,
      toolHandlers: {
        generate_screening_instrument: async (input) => {
          const region = (input.body_region as string) || bodyRegion;
          return SCREENING_INSTRUMENTS[region] ?? SCREENING_INSTRUMENTS.shoulder;
        },
        score_instrument: async () => ({
          severity_score: severityPct,
          classification: severityPct < 20 ? "minimal" : severityPct < 40 ? "mild" : severityPct < 60 ? "moderate" : severityPct < 80 ? "severe" : "complete",
        }),
      },
      thinking: { type: "enabled", budget_tokens: 8000 },
      maxTokens: 8192,
    });
    claudeAnalysis = result.response;
  } catch {
    // Fall back to deterministic analysis
  }

  // Build diagnostic result
  let functionalDeficits: string[] = [];
  let contraindications: string[] = [];
  try {
    const parsed = JSON.parse(claudeAnalysis);
    functionalDeficits = parsed.functional_deficits ?? parsed.functionalDeficits ?? [];
    contraindications = parsed.contraindications ?? [];
  } catch {
    // Use defaults based on region
    const deficitMap: Record<string, string[]> = {
      shoulder: ["overhead reach deficit", "internal rotation limitation"],
      knee: ["squat depth limitation", "stair negotiation difficulty"],
      lumbar: ["flexion intolerance", "prolonged sitting difficulty"],
      hip: ["hip flexion deficit", "single leg stance instability"],
      cervical: ["rotation limitation", "sustained posture intolerance"],
      ankle: ["dorsiflexion deficit", "single leg balance difficulty"],
    };
    functionalDeficits = deficitMap[bodyRegion] ?? [];
  }

  const diagnosticResult = {
    body_region: bodyRegion,
    side: (responses.side as string) || "bilateral",
    onset: (responses.onset as string) || "unknown",
    mechanism: (responses.mechanism as string) || "unknown",
    severity_score: severityPct,
    instrument_used: instrument.name,
    functional_deficits: functionalDeficits,
    contraindications,
    red_flags: detectedRedFlags,
    cleared_for_exercise: clearedForExercise,
  };

  // Persist to database
  const patientId = `patient_${Date.now()}`;
  const db = getDb();
  await db.insert(patients).values({
    id: patientId,
    profile_json: JSON.stringify({
      name: patientName || "Patient",
      diagnostic: diagnosticResult,
    }),
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    patient_id: patientId,
    diagnostic: diagnosticResult,
    instrument: instrument.name,
    questions: instrument.questions,
  });
}
