import { NextRequest } from "next/server";
import { generateCue } from "@/agents/cueGenerator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assessment, rep_number, set_number, exercise_name } = body;

    if (!exercise_name) {
      return Response.json({ error: "Missing exercise_name" }, { status: 400 });
    }

    const cue = await generateCue({ assessment, rep_number, set_number, exercise_name });
    return Response.json(cue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: "Cue generation failed", detail: message }, { status: 500 });
  }
}
