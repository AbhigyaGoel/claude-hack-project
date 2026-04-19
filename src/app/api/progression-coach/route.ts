import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { callClaudeSimple } from "@/lib/claude/client";
import { getDb } from "@/db";
import {
  narratorLog,
  patients,
  sessions,
  sets,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { loadPatientContext } from "@/lib/claude/memory";

/**
 * Progression Coach — the "P" of SOAP. Fires once at the end of a session.
 * Haiku, text-only. Looks at the whole workout, prior history, and prior
 * agent commentary, then writes a PLAIN-LANGUAGE recap for the patient.
 * No clinical jargon.
 *
 * Output shape (JSON):
 *   {
 *     message: string,                       // plain paragraph, the headline
 *     next_steps: string[],                  // 1–3 concrete things to do next time
 *     resources: [{title, description}, ...] // 0–3 follow-up ideas
 *   }
 *
 * The combined text gets written to narrator_log as source=coach so the
 * chat RAG and post-session screen can consume it.
 */

const SYSTEM_PROMPT = `You are a friendly, plain-spoken coach writing a short recap at the end of a patient's rehab workout.

HARD RULE — no clinical jargon. Write like you're talking to a smart friend who never went to PT school.

AVOID WORDS LIKE: valgus, varus, kinematic, proprioception, eccentric, concentric, ROM, flexion, extension, medial, lateral, contralateral, compensatory, antalgic, hypertonicity, facilitation, glute med, quad inhibition, joint-specific abbreviations.

USE WORDS LIKE: knee drifting inward, full stretch, hold at the top, leg muscle, balance, tightness, soreness that should fade, pain that doesn't.

Your output MUST be valid JSON matching this exact shape, with no markdown fencing:
{
  "message": "2–4 sentences. How today went, what to feel good about, what to keep in mind. Warm but honest. No jargon.",
  "next_steps": ["concrete action 1", "concrete action 2"],
  "resources": [{"title": "...", "description": "one sentence about what it is or helps with"}],
  "referral_advice": null
}

Rules:
- message: 2–4 sentences, conversational. Name ONE thing that went well and ONE thing to watch.
- next_steps: 1 to 3 items. Start each with a verb. Focused on what the PATIENT can do, not what a clinician would do.
- resources: 0 to 3 items. Can be self-care tips ("gentle calf stretches between sessions"), lifestyle ideas. No fake URLs.
- referral_advice: ONLY include this if pain_post >= 6 (you will be told the pain values in the prompt). Otherwise set it to null.
  If pain_post >= 6, replace null with:
  {
    "doctor_type": "sports medicine physician" | "orthopedic surgeon" | "physiatrist" | "neurologist" | "primary care physician",
    "urgency": "routine" | "soon" | "urgent",
    "what_to_tell_them": ["3-4 plain-language bullet points about the patient's situation"],
    "questions_to_ask": ["2-3 questions to bring to the appointment"]
  }
  Urgency rules:
  - "urgent": any red flags were detected during intake OR pain_post >= 8
  - "soon": pain_post 6-7 AND pain did not improve from pain_pre (or got worse)
  - "routine": pain_post 6-7 AND some improvement from pain_pre
  Keep what_to_tell_them in plain language — describe the body part, how long it's been an issue, what makes it better/worse.
- Output JSON only. No commentary, no code fences, no preamble.`;

interface Payload {
  patient_id: string;
  session_id: string;
}

interface ReferralAdvice {
  doctor_type: string;
  urgency: "routine" | "soon" | "urgent";
  what_to_tell_them: string[];
  questions_to_ask: string[];
}

interface CoachOutput {
  message: string;
  next_steps: string[];
  resources: { title: string; description: string }[];
  referral_advice?: ReferralAdvice | null;
}

function parseCoachOutput(raw: string): CoachOutput | null {
  // Strip any markdown fencing, then try to grab the outermost JSON object
  // in case Claude wrapped it in prose.
  const stripped = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  const jsonText = stripped.slice(firstBrace, lastBrace + 1);

  let obj: Partial<CoachOutput>;
  try {
    obj = JSON.parse(jsonText) as Partial<CoachOutput>;
  } catch {
    return null;
  }
  if (typeof obj.message !== "string" || !obj.message.trim()) return null;

  let referral_advice: ReferralAdvice | null = null;
  const raw_referral = (obj as Record<string, unknown>).referral_advice;
  if (raw_referral && typeof raw_referral === "object") {
    const r = raw_referral as Record<string, unknown>;
    if (typeof r.doctor_type === "string" && typeof r.urgency === "string") {
      referral_advice = {
        doctor_type: r.doctor_type,
        urgency: (["routine", "soon", "urgent"].includes(r.urgency) ? r.urgency : "routine") as ReferralAdvice["urgency"],
        what_to_tell_them: Array.isArray(r.what_to_tell_them) ? r.what_to_tell_them.map(String) : [],
        questions_to_ask: Array.isArray(r.questions_to_ask) ? r.questions_to_ask.map(String) : [],
      };
    }
  }

  return {
    message: obj.message,
    next_steps: Array.isArray(obj.next_steps)
      ? obj.next_steps.map(String).filter((s) => s.trim().length > 0)
      : [],
    resources: Array.isArray(obj.resources)
      ? obj.resources.filter(
          (r): r is { title: string; description: string } =>
            !!r && typeof r === "object" && typeof (r as { title?: unknown }).title === "string",
        )
      : [],
    referral_advice,
  };
}

function renderForLog(c: CoachOutput): string {
  const lines: string[] = [c.message];
  if (c.next_steps.length) {
    lines.push("", "Next time:");
    c.next_steps.forEach((s) => lines.push(`- ${s}`));
  }
  if (c.resources.length) {
    lines.push("", "Worth checking out:");
    c.resources.forEach((r) => lines.push(`- ${r.title}: ${r.description}`));
  }
  if (c.referral_advice) {
    const ref = c.referral_advice;
    lines.push("", `Consider seeing a ${ref.doctor_type} (${ref.urgency})`);
    ref.what_to_tell_them.forEach((s) => lines.push(`- ${s}`));
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.patient_id || !body.session_id) {
    return NextResponse.json(
      { error: "patient_id and session_id required" },
      { status: 400 },
    );
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

  // Gather this session's data + prior commentary + patient profile in parallel.
  const [sessionRow, thisSessionSets, thisSessionCommentary, patientContext, patientRow] =
    await Promise.all([
      db
        .select()
        .from(sessions)
        .where(eq(sessions.id, body.session_id))
        .limit(1),
      db
        .select()
        .from(sets)
        .where(eq(sets.session_id, body.session_id)),
      db
        .select({
          source: narratorLog.source,
          text: narratorLog.reasoning_text,
          t_ms: narratorLog.t_ms,
        })
        .from(narratorLog)
        .where(eq(narratorLog.session_id, body.session_id))
        .orderBy(asc(narratorLog.t_ms)),
      loadPatientContext(body.patient_id),
      db
        .select({ profile_json: patients.profile_json })
        .from(patients)
        .where(eq(patients.id, body.patient_id))
        .limit(1),
    ]);

  const session = sessionRow[0];
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const setLines = thisSessionSets.map(
    (s) =>
      `- ${s.exercise_name} set ${s.set_number}: ${s.reps} reps, form ${Math.round(
        (s.form_score ?? 0) * 100,
      )}%`,
  );

  const commentaryLines = thisSessionCommentary.map(
    (c) => `[${c.source}] ${c.text}`,
  );

  // Pull last 2 prior sessions for a quick trend anchor.
  const priorSessions = await db
    .select({
      started_at: sessions.started_at,
      pain_pre: sessions.pain_pre,
      pain_post: sessions.pain_post,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.patient_id, body.patient_id),
        eq(sessions.user_id, userId),
      ),
    )
    .orderBy(desc(sessions.started_at))
    .limit(3);
  const priorLines = priorSessions
    .filter((s) => s.started_at && s.pain_pre != null && s.pain_post != null)
    .map(
      (s) =>
        `  - ${s.started_at?.toISOString().slice(0, 10)}: pain ${s.pain_pre} → ${s.pain_post}`,
    );

  // Extract red flags and diagnostic info from patient profile for referral logic
  const profile = patientRow[0]?.profile_json as Record<string, unknown> | null;
  const diagnostic = profile?.diagnostic as Record<string, unknown> | undefined;
  const redFlags: string[] = Array.isArray(diagnostic?.red_flags) ? (diagnostic.red_flags as string[]) : [];
  const bodyRegion = typeof diagnostic?.body_region === "string" ? diagnostic.body_region : "the affected area";
  const mechanism = typeof diagnostic?.mechanism === "string" ? diagnostic.mechanism : null;
  const painPost = session.pain_post ?? null;

  const referralContext = painPost !== null && painPost >= 6
    ? [
        ``,
        `IMPORTANT: pain_post is ${painPost}/10 — this is >= 6, so you MUST include referral_advice in your JSON output.`,
        `Red flags detected at intake: ${redFlags.length ? redFlags.join(", ") : "none"}`,
        `Body region: ${bodyRegion}${mechanism ? `, mechanism: ${mechanism}` : ""}`,
      ]
    : [``, `pain_post is ${painPost ?? "unknown"}/10 — below 6, so set referral_advice to null.`];

  const userPrompt = [
    `Today's session just ended.`,
    ``,
    `Pain this session: ${session.pain_pre ?? "?"} → ${painPost ?? "?"}`,
    ...referralContext,
    ``,
    `Sets completed:`,
    ...(setLines.length ? setLines : ["  (none)"]),
    ``,
    `Prior sessions:`,
    ...(priorLines.length ? priorLines : ["  (none)"]),
    ``,
    `What the other agents observed during this session:`,
    ...(commentaryLines.length ? commentaryLines : ["  (none)"]),
    ``,
    `Write the recap in plain language as specified. Output JSON only.`,
  ].join("\n");

  const t0 = Date.now();
  let raw = "";
  try {
    raw = await callClaudeSimple({
      model: "claude-haiku-4-5-20251001",
      system: SYSTEM_PROMPT,
      systemParts: [SYSTEM_PROMPT, `\n\n# Patient Context\n${patientContext}`],
      prompt: userPrompt,
      maxTokens: 1200,
    });
    console.log(
      `[progression-coach] Haiku call returned in ${Date.now() - t0}ms (${raw.length} chars)`,
    );
  } catch (err) {
    console.error("[progression-coach] Claude call failed:", err);
    return NextResponse.json(
      { coach: null, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }

  if (!raw.trim()) {
    console.error("[progression-coach] Claude returned empty response");
    return NextResponse.json({ coach: null, error: "empty response" }, { status: 200 });
  }

  const parsed = parseCoachOutput(raw);
  if (!parsed) {
    console.error("[progression-coach] Unparseable coach output (first 500 chars):", raw.slice(0, 500));
    return NextResponse.json({ coach: null, raw }, { status: 200 });
  }

  try {
    await db.insert(narratorLog).values({
      patient_id: body.patient_id,
      session_id: body.session_id,
      source: "coach",
      t_ms: 0,
      reasoning_text: renderForLog(parsed),
    });
  } catch (err) {
    console.error("[progression-coach] narrator_log insert failed:", err);
  }

  return NextResponse.json({ coach: parsed });
}
