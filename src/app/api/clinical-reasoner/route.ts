import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { callClaudeSimple } from "@/lib/claude/client";
import { getDb } from "@/db";
import { narratorLog, patients } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { loadPatientContext } from "@/lib/claude/memory";

/**
 * Clinical Reasoner — the "A" of SOAP. Fires at the end of each set.
 * Given the set's objective observations + the patient's broader context,
 * produces one assessment sentence: pattern recognition, hypothesis, or
 * trend note. Uses Sonnet because this is where judgment matters.
 */

const SYSTEM_PROMPT = `You are a physical therapist writing one assessment line in a patient's chart at the end of an exercise set.

Inputs:
- Per-rep observations from this set (objective facts only).
- The patient's prior history, pattern observations, and goals.

Your job:
- Interpret. Connect this set's observations to known patterns or trends in the patient's history.
- State a hypothesis or clinical judgment, not just a restatement of facts.
- Cite specifics from history when relevant (e.g., "matches the glute med fatigue noted last session").

Rules:
- One sentence, max 35 words, chart-note style.
- No preamble, no emojis, no markdown — just the sentence.
- Do NOT recommend next steps (that's the progression coach's job).`;

interface Payload {
  patient_id: string;
  session_id?: string | null;
  exercise_name: string;
  set_number: number;
  observer_notes: string[];
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

  const owned = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, body.patient_id), eq(patients.user_id, userId)))
    .limit(1);
  if (owned.length === 0) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const patientContext = await loadPatientContext(body.patient_id);

  const observerNotes = body.observer_notes?.length
    ? body.observer_notes.map((n, i) => `  ${i + 1}. ${n}`).join("\n")
    : "  (no observer notes captured for this set)";

  const prompt = [
    `Set ${body.set_number} of ${body.exercise_name} just completed.`,
    ``,
    `Observations from this set:`,
    observerNotes,
  ].join("\n");

  let commentary = "";
  try {
    commentary = (
      await callClaudeSimple({
        model: "claude-sonnet-4-6",
        system: SYSTEM_PROMPT,
        systemParts: [SYSTEM_PROMPT, `\n\n# Patient Context\n${patientContext}`],
        prompt,
        maxTokens: 150,
      })
    ).trim();
  } catch (err) {
    console.error("[clinical-reasoner] Claude call failed:", err);
    return NextResponse.json({ commentary: null }, { status: 200 });
  }

  if (!commentary) {
    return NextResponse.json({ commentary: null }, { status: 200 });
  }

  try {
    await db.insert(narratorLog).values({
      patient_id: body.patient_id,
      session_id: body.session_id ?? null,
      source: "reasoner",
      t_ms: body.t_ms ?? 0,
      reasoning_text: commentary,
    });
  } catch (err) {
    console.error("[clinical-reasoner] narrator_log insert failed:", err);
  }

  return NextResponse.json({ commentary });
}
