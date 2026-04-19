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

const SYSTEM_PROMPT = `You are a physical therapy observer writing a short objective note for a patient's exercise chart.

You will see a still frame captured as the rep completed, plus the numeric angle context the client measured (treat the numbers as estimates — trust the image when they disagree).

Rules:
- State observable FACTS only: body alignment, joint positions, depth, symmetry, tempo cues, visible effort.
- Do NOT interpret, diagnose, or recommend. Those are other clinicians' jobs.
- Do NOT encourage or praise. This is a chart note, not coaching.
- 2 to 3 sentences, up to 60 words total.
- No preamble, no emojis, no markdown — just the sentences.
- If the image does not clearly show the patient performing the exercise, say so briefly ("patient not fully in frame") and stop.`;

const TEXT_ONLY_SYSTEM_PROMPT = `You are a physical therapy observer writing a short objective note for a patient's exercise chart.

You only have numeric data from client-side pose detection — no image.

Rules:
- State observable FACTS only from the numbers: angle deficit, form-quality bucket, rep/set context.
- Do NOT interpret, diagnose, or recommend.
- 2 sentences, up to 45 words total. Chart-note style.
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
