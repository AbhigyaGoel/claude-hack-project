import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { callClaudeSimple, callClaudeVision } from "@/lib/claude/client";
import { getDb } from "@/db";
import { narratorLog, patients } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

/**
 * Form Observer — the "O" of SOAP. Fires per-rep.
 *
 * When the client sends a `frame_base64` (a webcam snapshot taken as the rep
 * completed), the observer uses Claude Sonnet with Vision so observations
 * are grounded in what the patient actually looks like, not just the
 * MediaPipe angle estimate. If no frame is supplied the endpoint falls back
 * to Haiku text-only with the numeric context — this keeps things working
 * if the camera isn't available for some reason.
 */

const SYSTEM_PROMPT = `You are a physical therapy observer writing a short, friendly chart note on a patient's exercise rep.

You will see a still frame from the moment the rep completed, plus the numeric angle context the client measured (treat the numbers as rough estimates — trust the image).

PRINCIPLES
- Always write something useful. This is a low-fidelity webcam setup in a home; the patient is often off-center, partially framed, or improvising the exercise.
- Be forgiving and encouraging in tone. A warm chart note, not a cold one. Still observational rather than cheerleading — note what you actually see.
- If the patient isn't performing the exact prescribed exercise, that's fine. Describe what they ARE doing (standing, stretching, bending forward, etc.) and give best-effort feedback on that movement.
- If the frame is blurry or the patient is partly off-screen, comment on whatever IS visible (posture, arm position, visible effort) — don't stop or refuse.

WHAT TO WRITE
- 2 to 3 sentences, up to 60 words total.
- One observation about body position or movement.
- One note on what looked steady, controlled, or worth being mindful of — phrased gently.
- Plain language. Skip clinical jargon like "valgus" or "flexion" — say "knee drifting inward" or "bend at the knee."

STYLE
- No preamble, no emojis, no markdown, no headers. Just the sentences.
- Do not diagnose or recommend next steps (other agents handle that).
- Never refuse, never say "cannot assess" — always produce a useful note.`;

const TEXT_ONLY_SYSTEM_PROMPT = `You are a physical therapy observer writing a short, friendly chart note for a patient's exercise rep.

You only have numeric data from client-side pose detection — no image. Work with what you have and be generous with the patient.

Rules:
- 2 sentences, up to 45 words total.
- One line on the measured movement (depth relative to target, rep/set context).
- One line that's observational but warm — note what looked steady or what to keep in mind.
- Plain language, no jargon. No encouragement puff. No diagnosis.
- Never refuse — always produce a useful note.
- No preamble, no emojis, no markdown.`;

interface Payload {
  patient_id: string;
  session_id?: string | null;
  exercise_name: string;
  rep_number: number;
  set_number: number;
  peak_angle: number;
  target_angle: number;
  quality: "green" | "yellow" | "red";
  t_ms?: number;
  /** Base64 JPEG (no data: prefix) of a webcam frame at rep completion. */
  frame_base64?: string;
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.patient_id || !body.exercise_name) {
    return NextResponse.json({ error: "patient_id and exercise_name required" }, { status: 400 });
  }

  const db = getDb();

  const owned = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, body.patient_id), eq(patients.user_id, userId)))
    .limit(1);
  if (owned.length === 0) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const deficit = Math.round(body.peak_angle - body.target_angle);
  const context = [
    `Exercise: ${body.exercise_name}`,
    `Rep ${body.rep_number} of set ${body.set_number}`,
    `Measured peak joint angle: ${Math.round(body.peak_angle)}° (target ${Math.round(body.target_angle)}°, ${deficit >= 0 ? "+" : ""}${deficit}°)`,
    `Client form-quality bucket: ${body.quality}`,
  ].join("\n");

  let commentary = "";
  let usedVision = false;

  try {
    if (body.frame_base64) {
      usedVision = true;
      commentary = (
        await callClaudeVision({
          model: "claude-sonnet-4-6",
          system: SYSTEM_PROMPT,
          imageBase64: body.frame_base64,
          prompt: `${context}\n\nWrite the chart note based primarily on the image. 2–3 sentences.`,
          maxTokens: 200,
        })
      ).trim();
    } else {
      commentary = (
        await callClaudeSimple({
          model: "claude-haiku-4-5-20251001",
          system: TEXT_ONLY_SYSTEM_PROMPT,
          prompt: `${context}\n\nWrite the chart note from the numbers above.`,
          maxTokens: 120,
        })
      ).trim();
    }
  } catch (err) {
    console.error("[form-observer] Claude call failed:", err);
    return NextResponse.json({ commentary: null }, { status: 200 });
  }

  if (!commentary) {
    return NextResponse.json({ commentary: null }, { status: 200 });
  }

  try {
    await db.insert(narratorLog).values({
      patient_id: body.patient_id,
      session_id: body.session_id ?? null,
      source: "observer",
      t_ms: body.t_ms ?? 0,
      reasoning_text: commentary,
    });
  } catch (err) {
    console.error("[form-observer] narrator_log insert failed:", err);
  }

  return NextResponse.json({ commentary, used_vision: usedVision });
}
