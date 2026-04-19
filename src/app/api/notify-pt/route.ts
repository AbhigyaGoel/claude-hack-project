import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { patients, sessions, sets } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

const TEXTBELT_KEY = process.env.TEXTBELT_KEY ?? "textbelt"; // "textbelt" = 1 free/day

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { session_id?: string; patient_id?: string } | null;
  if (!body?.session_id || !body.patient_id) {
    return NextResponse.json({ error: "session_id and patient_id required" }, { status: 400 });
  }

  const db = getDb();

  const [patientRow, sessionRow, setSummary] = await Promise.all([
    db.select({ name: patients.name, pt_phone: patients.pt_phone })
      .from(patients).where(eq(patients.id, body.patient_id)).limit(1),
    db.select({ pain_pre: sessions.pain_pre, pain_post: sessions.pain_post, started_at: sessions.started_at })
      .from(sessions).where(eq(sessions.id, body.session_id)).limit(1),
    db.select({ exercise_name: sets.exercise_name })
      .from(sets).where(eq(sets.session_id, body.session_id)),
  ]);

  const patient = patientRow[0];
  const session = sessionRow[0];

  if (!patient?.pt_phone) {
    return NextResponse.json({ skipped: true, reason: "no pt_phone set" });
  }

  const date = session?.started_at
    ? new Date(session.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "today";
  const painLine = session?.pain_pre != null && session?.pain_post != null
    ? `Pain: ${session.pain_pre} → ${session.pain_post}/10.`
    : "";
  const exerciseNames = [...new Set(setSummary.map((s) => s.exercise_name))];
  const exerciseLine = exerciseNames.length > 0
    ? `Exercises: ${exerciseNames.join(", ")}.`
    : "";

  const message = [
    `Vero AI — ${patient.name} completed their PT session on ${date}.`,
    painLine,
    exerciseLine,
    `Full report available in the Vero app.`,
  ].filter(Boolean).join(" ");

  const res = await fetch("https://textbelt.com/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: patient.pt_phone,
      message,
      key: TEXTBELT_KEY,
    }),
  });

  const result = await res.json() as { success: boolean; error?: string; quotaRemaining?: number };

  if (!result.success) {
    console.error("[notify-pt] TextBelt error:", result.error);
    return NextResponse.json({ error: result.error }, { status: 200 });
  }

  console.log(`[notify-pt] SMS sent to PT for ${patient.name} (quota remaining: ${result.quotaRemaining})`);
  return NextResponse.json({ sent: true, to: patient.pt_phone, quotaRemaining: result.quotaRemaining });
}
