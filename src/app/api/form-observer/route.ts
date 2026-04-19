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

const SYSTEM_PROMPT = `You ARE the physical therapist in the room with the patient. Talk TO them in second person, like a real PT speaking over their shoulder mid-set.

You see a still frame from the moment the rep finished plus rough angle numbers (trust the image if they disagree).

THE VOICE
- Short. Pointed. High-impact. Think sideline cue, not chart note.
- Hard cap: ONE sentence, 6–14 words. Usually fewer.
- Second person always ("your knee", "go deeper", "nice and steady") — never "the patient" or "they."
- Plain language. No jargon. Say "knee caves in" not "valgus"; "bend your knees" not "flexion."

WHAT TO SAY
- One quick observation OR one tiny cue. Not both.
- Examples of the vibe: "Nice depth there." · "Knee's caving in a bit." · "Keep that chest up." · "Stay steady." · "Go a touch deeper next rep." · "Shoulders back."
- If the patient is off-frame or improvising, give a one-line nudge on whatever they ARE doing.
- Never refuse, never hedge, never say "cannot assess."
- No preamble, no emojis, no markdown. Just the line.`;

const TEXT_ONLY_SYSTEM_PROMPT = `You ARE the physical therapist in the room with the patient. No image — just rough angle numbers. Give one quick in-the-moment cue.

Rules:
- ONE sentence, 6–14 words. Short and useful.
- Second person. Talk TO the patient ("your", "you", imperatives like "keep", "push", "steady").
- One observation OR one micro-cue — not both.
- Plain language, no jargon. No preamble, no emojis.
- Never refuse.`;

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
          prompt: `${context}\n\nGive your ONE-sentence PT cue based on what you see.`,
          maxTokens: 50,
        })
      ).trim();
    } else {
      commentary = (
        await callClaudeSimple({
          model: "claude-haiku-4-5-20251001",
          system: TEXT_ONLY_SYSTEM_PROMPT,
          prompt: `${context}\n\nGive your ONE-sentence PT cue from the numbers above.`,
          maxTokens: 40,
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
