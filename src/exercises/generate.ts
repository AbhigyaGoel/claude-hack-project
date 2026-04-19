/**
 * One-time exercise library generation script.
 *
 * Uses the Anthropic SDK with Claude Opus + extended thinking to generate
 * ~30-40 exercises per body region. Output is written to src/data/exercises.json.
 *
 * Usage:
 *   npx tsx src/exercises/generate.ts
 *
 * Requires ANTHROPIC_API_KEY in environment.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import * as path from "node:path";

const BODY_REGIONS = [
  "shoulder",
  "knee",
  "hip",
  "lumbar",
  "cervical",
  "ankle",
] as const;

type BodyRegion = (typeof BODY_REGIONS)[number];

interface CompensationPattern {
  readonly name: string;
  readonly detection: string;
  readonly landmarks: readonly number[];
  readonly severity: "yellow" | "red";
}

interface Exercise {
  readonly id: string;
  readonly name: string;
  readonly body_region: BodyRegion;
  readonly category: string;
  readonly difficulty_tier: 1 | 2 | 3 | 4 | 5;
  readonly equipment: readonly string[];
  readonly target_muscles: readonly string[];
  readonly primary_joint_angle: string;
  readonly target_angles: Readonly<Record<string, number>>;
  readonly tolerances: Readonly<Record<string, number>>;
  readonly tempo_seconds: string;
  readonly default_sets: number;
  readonly default_reps: number;
  readonly cues: readonly string[];
  readonly compensation_patterns: readonly CompensationPattern[];
  readonly contraindications: readonly string[];
  readonly regression: string;
  readonly progression: string;
}

const EXERCISE_SCHEMA_EXAMPLE = `{
  "id": "wall_slide_01",
  "name": "Wall Slide",
  "body_region": "shoulder",
  "category": "mobility",
  "difficulty_tier": 1,
  "equipment": ["wall"],
  "target_muscles": ["lower_trapezius", "serratus_anterior"],
  "primary_joint_angle": "shoulder_flexion_degrees",
  "target_angles": {
    "shoulder_flexion_degrees": 150,
    "elbow_extension_degrees": 170
  },
  "tolerances": {
    "shoulder_flexion_degrees": 10,
    "elbow_extension_degrees": 10
  },
  "tempo_seconds": "3-1-2-0",
  "default_sets": 3,
  "default_reps": 10,
  "cues": [
    "Squeeze shoulder blades down and back",
    "Slide pinky side of hand up the wall",
    "Keep ribs down — don't arch your back"
  ],
  "compensation_patterns": [
    {
      "name": "scapular_elevation",
      "detection": "shoulder landmark y decreases relative to ear landmark y by >2cm during flexion",
      "landmarks": [11, 7],
      "severity": "yellow"
    },
    {
      "name": "lumbar_extension",
      "detection": "hip landmark moves anterior >3cm during overhead reach",
      "landmarks": [23, 11],
      "severity": "red"
    }
  ],
  "contraindications": ["acute_rotator_cuff_tear", "shoulder_dislocation_recent"],
  "regression": "Reduce ROM to pain-free range",
  "progression": "Add 1lb wrist weight"
}`;

function buildPrompt(region: BodyRegion): string {
  return `You are an expert physical therapist and exercise scientist. Generate exactly 35 exercises for the "${region}" body region.

Each exercise MUST follow this exact JSON schema:
${EXERCISE_SCHEMA_EXAMPLE}

Requirements:
- "id" must be unique, lowercase_snake_case with a numeric suffix (e.g., "chin_tuck_01")
- "body_region" must be "${region}"
- "category" must be one of: "mobility", "strengthening", "stabilization", "stretching", "neuromuscular", "plyometric"
- "difficulty_tier" from 1 (easiest, post-surgical) to 5 (advanced/athletic)
- "equipment" is an array of strings (can be empty)
- "target_muscles" lists the primary muscles worked
- "primary_joint_angle" is the main joint angle measured in degrees
- "target_angles" maps joint angle names to target degrees
- "tolerances" maps the same joint angle names to acceptable deviation in degrees
- "tempo_seconds" uses "eccentric-pause_bottom-concentric-pause_top" format
- "cues" has 2-4 coaching cues
- "compensation_patterns" each have name, detection description, MediaPipe landmark indices, and severity ("yellow" for warning, "red" for stop)
- "contraindications" lists conditions where this exercise should be avoided
- "regression" and "progression" describe easier/harder variants

Include a diverse mix of:
- Categories (mobility, strengthening, stabilization, stretching, neuromuscular)
- Difficulty tiers (1-5, with more exercises at tiers 1-3 for rehab focus)
- Equipment needs (bodyweight, bands, dumbbells, machines, etc.)
- Exercises commonly used in physical therapy rehabilitation

Use realistic, clinically accurate values for angles, tolerances, tempos, and compensation patterns.
Use MediaPipe BlazePose landmark indices (0-32) for compensation pattern landmarks.

Return ONLY a JSON array of 35 exercise objects. No markdown, no explanation, just valid JSON.`;
}

function validateExercise(exercise: unknown, index: number, region: string): exercise is Exercise {
  const errors: string[] = [];
  const ex = exercise as Record<string, unknown>;

  if (typeof ex.id !== "string") errors.push(`[${index}] missing/invalid id`);
  if (typeof ex.name !== "string") errors.push(`[${index}] missing/invalid name`);
  if (ex.body_region !== region) errors.push(`[${index}] body_region should be ${region}, got ${ex.body_region}`);
  if (typeof ex.difficulty_tier !== "number" || ex.difficulty_tier < 1 || ex.difficulty_tier > 5) {
    errors.push(`[${index}] difficulty_tier must be 1-5`);
  }
  if (!Array.isArray(ex.cues) || ex.cues.length === 0) errors.push(`[${index}] cues must be non-empty array`);
  if (!Array.isArray(ex.compensation_patterns)) errors.push(`[${index}] compensation_patterns must be array`);
  if (typeof ex.regression !== "string") errors.push(`[${index}] missing regression`);
  if (typeof ex.progression !== "string") errors.push(`[${index}] missing progression`);

  if (errors.length > 0) {
    console.warn(`Validation warnings for ${region} exercise ${index}:`, errors);
    return false;
  }
  return true;
}

async function generateExercisesForRegion(
  client: Anthropic,
  region: BodyRegion
): Promise<readonly Exercise[]> {
  console.log(`Generating exercises for ${region}...`);

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    thinking: {
      type: "adaptive" as const,
    },
    messages: [
      {
        role: "user",
        content: buildPrompt(region),
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text response for region: ${region}`);
  }

  const rawText = textBlock.text.trim();

  // Try to extract JSON array from the response
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not find JSON array in response for region: ${region}`);
  }

  const exercises: unknown[] = JSON.parse(jsonMatch[0]);

  if (!Array.isArray(exercises)) {
    throw new Error(`Response is not an array for region: ${region}`);
  }

  const validExercises = exercises.filter((ex, i) => validateExercise(ex, i, region));

  console.log(
    `  ${region}: generated ${exercises.length} exercises, ${validExercises.length} valid`
  );

  return validExercises as readonly Exercise[];
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const allExercises: Exercise[] = [];

  // Process regions sequentially to avoid rate limits
  for (const region of BODY_REGIONS) {
    try {
      const exercises = await generateExercisesForRegion(client, region);
      allExercises.push(...exercises);
    } catch (error) {
      console.error(`Failed to generate exercises for ${region}:`, error);
      console.log(`Continuing with remaining regions...`);
    }
  }

  console.log(`\nTotal exercises generated: ${allExercises.length}`);

  // Verify no duplicate IDs
  const ids = new Set<string>();
  const duplicates: string[] = [];
  for (const ex of allExercises) {
    if (ids.has(ex.id)) {
      duplicates.push(ex.id);
    }
    ids.add(ex.id);
  }

  if (duplicates.length > 0) {
    console.warn(`Warning: duplicate IDs found: ${duplicates.join(", ")}`);
  }

  // Write output
  const outputPath = path.resolve(__dirname, "../data/exercises.json");
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(allExercises, null, 2) + "\n", "utf-8");
  console.log(`Written to ${outputPath}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
