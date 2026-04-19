import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  patientMemory,
  patients,
  plans,
  sessions,
  sets,
  repAnalyses,
  narratorLog,
} from "@/db/schema";

async function getOwnerId(patientId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ user_id: patients.user_id })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);
  return row?.user_id ?? null;
}

/**
 * Patient memory — persistent per-patient notes curated by Claude.
 *
 * Previously backed by the filesystem (`patient-memory/{patient_id}/*`);
 * now backed by the `patient_memory` table in Postgres. The API shape is
 * preserved so agents and routes keep working:
 *
 *   readMemoryFile / writeMemoryFile / appendMemoryFile / listMemoryFiles
 *   loadPatientContext / createMemoryToolHandlers
 *
 * Canonical filenames Claude maintains per patient:
 * - case_notes.md — running SOAP notes
 * - progression_history.json — exercise advancement decisions
 * - pattern_observations.md — compensations, preferences, pain triggers
 * - goals.md — functional goals + progress
 */

export async function readMemoryFile(
  patientId: string,
  filename: string,
): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ content: patientMemory.content })
    .from(patientMemory)
    .where(
      and(eq(patientMemory.patient_id, patientId), eq(patientMemory.filename, filename)),
    )
    .limit(1);
  return rows[0]?.content ?? null;
}

export async function writeMemoryFile(
  patientId: string,
  filename: string,
  content: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(patientMemory)
    .values({
      patient_id: patientId,
      user_id: await getOwnerId(patientId),
      filename,
      content,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [patientMemory.patient_id, patientMemory.filename],
      set: { content, updated_at: new Date() },
    });
}

export async function appendMemoryFile(
  patientId: string,
  filename: string,
  content: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(patientMemory)
    .values({
      patient_id: patientId,
      user_id: await getOwnerId(patientId),
      filename,
      content,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [patientMemory.patient_id, patientMemory.filename],
      set: {
        content: sql`${patientMemory.content} || E'\n' || ${content}`,
        updated_at: new Date(),
      },
    });
}

export async function listMemoryFiles(patientId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ filename: patientMemory.filename })
    .from(patientMemory)
    .where(eq(patientMemory.patient_id, patientId));
  return rows.map((r) => r.filename);
}

/**
 * Load a full patient context bundle for chat / narrator prompt injection.
 *
 * Structured as markdown so Claude's attention treats each section as a
 * distinct block. Pulls:
 *   1. Curated memory files (case notes, goals, patterns, progression).
 *   2. Active plan — currently prescribed exercises.
 *   3. Last 10 sessions with pain pre/post + duration.
 *   4. Last 30 rep analyses (faults, quality) across recent sessions.
 *   5. Last 20 narrator_log entries — every prior Claude PT observation.
 *
 * Kept under ~8KB in the typical case so prompt caching stays cheap.
 */
export async function loadPatientContext(patientId: string): Promise<string> {
  const db = getDb();

  const [memoryRows, planRows, sessionRows, narratorRows] = await Promise.all([
    db
      .select({ filename: patientMemory.filename, content: patientMemory.content })
      .from(patientMemory)
      .where(eq(patientMemory.patient_id, patientId))
      .orderBy(patientMemory.filename),
    db
      .select({ plan_json: plans.plan_json, created_at: plans.created_at })
      .from(plans)
      .where(and(eq(plans.patient_id, patientId), eq(plans.active, true)))
      .orderBy(desc(plans.created_at))
      .limit(1),
    db
      .select({
        id: sessions.id,
        started_at: sessions.started_at,
        ended_at: sessions.ended_at,
        pain_pre: sessions.pain_pre,
        pain_post: sessions.pain_post,
      })
      .from(sessions)
      .where(eq(sessions.patient_id, patientId))
      .orderBy(desc(sessions.started_at))
      .limit(10),
    db
      .select({
        source: narratorLog.source,
        text: narratorLog.reasoning_text,
        created_at: narratorLog.created_at,
      })
      .from(narratorLog)
      .where(eq(narratorLog.patient_id, patientId))
      .orderBy(desc(narratorLog.created_at))
      .limit(20),
  ]);

  // Fetch rep analyses for the recent sessions in one batched lookup.
  let repAnalysisRows: Array<{
    quality: number | null;
    faults_json: unknown;
    exercise_name: string;
    session_started_at: Date | null;
  }> = [];
  if (sessionRows.length > 0) {
    repAnalysisRows = await db
      .select({
        quality: repAnalyses.quality,
        faults_json: repAnalyses.faults_json,
        exercise_name: sets.exercise_name,
        session_started_at: sessions.started_at,
      })
      .from(repAnalyses)
      .innerJoin(sets, eq(sets.id, repAnalyses.set_id))
      .innerJoin(sessions, eq(sessions.id, sets.session_id))
      .where(eq(sessions.patient_id, patientId))
      .orderBy(desc(sessions.started_at))
      .limit(30);
  }

  const sections: string[] = [];

  // 1. Memory files — the richest source, put first.
  if (memoryRows.length > 0) {
    sections.push(
      "# Curated Notes\n\n" +
        memoryRows.map((r) => `## ${r.filename}\n${r.content}`).join("\n\n"),
    );
  }

  // 2. Active plan
  if (planRows.length > 0) {
    const plan = planRows[0].plan_json as { exercises?: Array<{ name?: string; sets?: number; reps?: number }> } | null;
    const exerciseList = plan?.exercises
      ?.map((ex) => `  - ${ex.name ?? "?"}: ${ex.sets ?? "?"}x${ex.reps ?? "?"}`)
      .join("\n");
    if (exerciseList) {
      sections.push(`# Active Plan\n${exerciseList}`);
    }
  }

  // 3. Recent sessions
  if (sessionRows.length > 0) {
    const lines = sessionRows.map((s) => {
      const date = s.started_at
        ? new Date(s.started_at).toISOString().slice(0, 10)
        : "?";
      const duration =
        s.started_at && s.ended_at
          ? Math.max(1, Math.round((+new Date(s.ended_at) - +new Date(s.started_at)) / 60000))
          : null;
      const pain =
        s.pain_pre != null && s.pain_post != null
          ? `pain ${s.pain_pre}→${s.pain_post}`
          : s.pain_pre != null
            ? `pain pre ${s.pain_pre}`
            : "pain —";
      return `  - ${date}${duration ? ` (${duration}m)` : ""} · ${pain}`;
    });
    sections.push(`# Recent Sessions (most recent first)\n${lines.join("\n")}`);
  }

  // 4. Recent rep analyses — only include ones that actually reported faults.
  const repLines: string[] = [];
  for (const ra of repAnalysisRows) {
    const faults = Array.isArray(ra.faults_json) ? (ra.faults_json as unknown[]) : [];
    if (faults.length === 0) continue;
    const date = ra.session_started_at
      ? new Date(ra.session_started_at).toISOString().slice(0, 10)
      : "?";
    const faultSummary = faults
      .slice(0, 3)
      .map((f) => {
        if (f && typeof f === "object") {
          const obj = f as { description?: string; type?: string };
          return obj.description || obj.type || "fault";
        }
        return String(f);
      })
      .join("; ");
    const quality = ra.quality != null ? ` (q=${ra.quality.toFixed(2)})` : "";
    repLines.push(`  - ${date} ${ra.exercise_name}${quality}: ${faultSummary}`);
  }
  if (repLines.length > 0) {
    sections.push(`# Recent Rep Issues\n${repLines.join("\n")}`);
  }

  // 5. Prior Claude commentary — the narrator_log bridge.
  if (narratorRows.length > 0) {
    const lines = narratorRows
      .slice()
      .reverse() // chronological for readability
      .map((n) => {
        const date = n.created_at
          ? new Date(n.created_at).toISOString().slice(0, 10)
          : "?";
        const snippet = n.text.length > 400 ? `${n.text.slice(0, 400)}…` : n.text;
        return `### [${n.source} · ${date}]\n${snippet}`;
      });
    sections.push(`# Prior PT Commentary\n${lines.join("\n\n")}`);
  }

  if (sections.length === 0) return "No prior history for this patient.";
  return sections.join("\n\n---\n\n");
}

/**
 * Memory tool handlers for Claude tool-use. Shape is unchanged from the
 * filesystem implementation; handlers are still async and return the same
 * JSON envelopes.
 */
export function createMemoryToolHandlers(patientId: string) {
  return {
    read_memory: async (input: Record<string, unknown>) => {
      const filename = input.filename as string;
      const content = await readMemoryFile(patientId, filename);
      return { filename, content: content ?? "File not found", exists: content !== null };
    },
    write_memory: async (input: Record<string, unknown>) => {
      const filename = input.filename as string;
      const content = input.content as string;
      await writeMemoryFile(patientId, filename, content);
      return { filename, written: true };
    },
    append_memory: async (input: Record<string, unknown>) => {
      const filename = input.filename as string;
      const content = input.content as string;
      await appendMemoryFile(patientId, filename, content);
      return { filename, appended: true };
    },
    list_memory: async () => {
      return { files: await listMemoryFiles(patientId) };
    },
  };
}

export const MEMORY_TOOLS = [
  {
    name: "read_memory",
    description: "Read a file from the patient's memory namespace",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: { type: "string", description: "File to read (e.g., case_notes.md)" },
      },
      required: ["filename"],
    },
  },
  {
    name: "write_memory",
    description: "Write/overwrite a file in the patient's memory namespace",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: { type: "string", description: "File to write" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["filename", "content"],
    },
  },
  {
    name: "append_memory",
    description: "Append content to a file in the patient's memory namespace",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: { type: "string", description: "File to append to" },
        content: { type: "string", description: "Content to append" },
      },
      required: ["filename", "content"],
    },
  },
  {
    name: "list_memory",
    description: "List all files in the patient's memory namespace",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];
