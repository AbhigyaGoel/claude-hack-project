import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { callClaudeSimple } from "@/lib/claude/client";
import { getDb } from "@/db";
import { narratorLog, patients } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

/**
 * Rep commentary — called by the session page after each completed rep.
 * Produces one sentence of PT-style commentary via Haiku (sub-second) and
 * writes it to narrator_log as source=rep_analysis. Fire-and-forget from
 * the client so a slow Claude call never stalls the rep loop.
 */

const SYSTEM_PROMPT = `You are a physical therapist watching a patient do a specific rep of their prescribed exercise.
Write ONE concise sentence (max 25 words) of clinical observation or encouragement, as if jotting a chart note.
Be specific: reference the angle deficit, compensation, or quality.
No preamble, no emojis, no markdown — just the sentence.`;

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

  // Patient ownership — user can't write commentary for someone else's patient.
  const owned = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, body.patient_id), eq(patients.user_id, userId)))
    .limit(1);
  if (owned.length === 0) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const deficit = Math.round(body.peak_angle - body.target_angle);
  const prompt = [
    `Exercise: ${body.exercise_name}`,
    `Rep ${body.rep_number} of set ${body.set_number}`,
    `Target peak angle: ${Math.round(body.target_angle)}° · Actual: ${Math.round(body.peak_angle)}° (${deficit >= 0 ? "+" : ""}${deficit}°)`,
    `Form quality: ${body.quality}`,
  ].join("\n");

  let commentary = "";
  try {
    commentary = (
      await callClaudeSimple({
        model: "claude-haiku-4-5-20251001",
        system: SYSTEM_PROMPT,
        prompt,
        maxTokens: 80,
      })
    ).trim();
  } catch (err) {
    console.error("[rep-commentary] Claude call failed:", err);
    return NextResponse.json({ commentary: null }, { status: 200 });
  }

  if (!commentary) {
    return NextResponse.json({ commentary: null }, { status: 200 });
  }

  try {
    await db.insert(narratorLog).values({
      patient_id: body.patient_id,
      session_id: body.session_id ?? null,
      source: "rep_analysis",
      t_ms: body.t_ms ?? 0,
      reasoning_text: commentary,
    });
  } catch (err) {
    console.error("[rep-commentary] narrator_log insert failed:", err);
  }

  return NextResponse.json({ commentary });
}
