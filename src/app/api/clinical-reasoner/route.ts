import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { streamClaude } from "@/lib/claude/client";
import { getDb } from "@/db";
import { narratorLog, patients } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { loadPatientContext } from "@/lib/claude/memory";

/**
 * Clinical Reasoner — the "A" of SOAP. Fires at the end of each set.
 * Streams a 2-3 sentence clinical insight connecting the set's observations
 * to the patient's diagnosis and history. Uses SSE so the rest screen can
 * display it live as it generates.
 */

const SYSTEM_PROMPT = `You are a physical therapist writing a brief clinical assessment after an exercise set.

Inputs you receive:
- Per-rep observer commentary (plain-language descriptions of what was seen).
- Structured biomechanical data from the form critic: per-rep fault list (joint, severity 1-5, phase), compensation patterns, quality score (0-100%), tempo deviation.
- The patient's diagnosis, history, patterns, and goals.

Your job:
- Use the structured fault/compensation data as your primary clinical signal — it's precise.
- Use the observer notes as supporting context.
- Interpret the pattern against the patient's known condition and history.
- Say what the faults or compensations *indicate* clinically — connect to the diagnosis or prior patterns.
- Be specific: name joints, fault types, and how they relate to the underlying condition.

Rules:
- 2–3 sentences, max 60 words total.
- Chart-note style but readable — clinical but not jargon-heavy.
- Do NOT recommend what to do next (that's the coach's job at session end).
- No preamble, no emojis, no markdown.`;

interface RepFault {
  type: string;
  joint: string;
  description: string;
  severity: number;
  phase: string;
}

interface RepCompensation {
  primary_joint: string;
  compensating_joint: string;
  description: string;
}

interface RepAnalysis {
  faults: RepFault[];
  quality: number;
  compensations: RepCompensation[];
  tempo_deviation: number;
}

interface Payload {
  patient_id: string;
  session_id?: string | null;
  exercise_name: string;
  set_number: number;
  observer_notes: string[];
  form_critic_results?: RepAnalysis[];
  t_ms?: number;
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.patient_id || !body.exercise_name) {
    return new Response(JSON.stringify({ error: "patient_id and exercise_name required" }), { status: 400 });
  }

  const db = getDb();

  const owned = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, body.patient_id), eq(patients.user_id, userId)))
    .limit(1);
  if (owned.length === 0) {
    return new Response(JSON.stringify({ error: "patient not found" }), { status: 404 });
  }

  const patientContext = await loadPatientContext(body.patient_id);

  const observerNotes = body.observer_notes?.length
    ? body.observer_notes.map((n, i) => `  ${i + 1}. ${n}`).join("\n")
    : "  (no observer notes captured for this set)";

  // Format structured form critic results per rep
  const formCriticLines: string[] = [];
  if (body.form_critic_results?.length) {
    body.form_critic_results.forEach((rep, i) => {
      const repNum = i + 1;
      const qualityPct = Math.round(rep.quality * 100);
      const faultLines = rep.faults.length
        ? rep.faults.map((f) => `    - [${f.joint}, sev ${f.severity}] ${f.description} (${f.phase})`)
        : ["    - no faults"];
      const compLines = rep.compensations.length
        ? rep.compensations.map((c) => `    - ${c.primary_joint} → ${c.compensating_joint}: ${c.description}`)
        : [];
      formCriticLines.push(`  Rep ${repNum}: quality ${qualityPct}%, tempo deviation ${rep.tempo_deviation.toFixed(2)}s`);
      formCriticLines.push(`  Faults:`);
      formCriticLines.push(...faultLines);
      if (compLines.length) {
        formCriticLines.push(`  Compensations:`);
        formCriticLines.push(...compLines);
      }
    });
  }

  const prompt = [
    `Set ${body.set_number} of ${body.exercise_name} just completed.`,
    ``,
    `Observer commentary (plain-language, per rep):`,
    observerNotes,
    ...(formCriticLines.length ? [
      ``,
      `Biomechanical analysis (structured form critic data, per rep):`,
      ...formCriticLines,
    ] : []),
  ].join("\n");

  const encoder = new TextEncoder();
  let accumulated = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = streamClaude({
          model: "claude-sonnet-4-6",
          system: SYSTEM_PROMPT,
          systemParts: [SYSTEM_PROMPT, `\n\n# Patient Context\n${patientContext}`],
          messages: [{ role: "user", content: prompt }],
          maxTokens: 200,
        });

        for await (const chunk of claudeStream) {
          if (chunk.type === "text") {
            accumulated += chunk.content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk.content })}\n\n`)
            );
          }
        }

        // Persist full text to narratorLog after stream completes
        if (accumulated.trim()) {
          try {
            await db.insert(narratorLog).values({
              patient_id: body.patient_id,
              session_id: body.session_id ?? null,
              source: "reasoner",
              t_ms: body.t_ms ?? 0,
              reasoning_text: accumulated.trim(),
            });
          } catch (err) {
            console.error("[clinical-reasoner] narrator_log insert failed:", err);
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (err) {
        console.error("[clinical-reasoner] stream error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", content: String(err) })}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
