import { NextRequest, NextResponse } from "next/server";
import { checkSafety } from "@/agents/safetyMonitor";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await checkSafety({
    session_id: body.session_id,
    patient_id: body.patient_id,
    exercise_name: body.exercise_name,
    rep_number: body.rep_number,
    set_number: body.set_number,
    peak_angle: body.peak_angle,
    target_angle: body.target_angle,
    pain_pre: body.pain_pre,
    current_faults: body.current_faults,
    keypoints: body.keypoints,
    frame_base64: body.frame_base64,
  });

  return NextResponse.json(result);
}
