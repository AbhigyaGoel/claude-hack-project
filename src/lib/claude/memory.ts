import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { patientMemory } from "@/db/schema";
import { getDemoUserId } from "@/lib/supabase";

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
      user_id: getDemoUserId(),
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
      user_id: getDemoUserId(),
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
 * Load all patient memory as a single context string for prompt injection.
 */
export async function loadPatientContext(patientId: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ filename: patientMemory.filename, content: patientMemory.content })
    .from(patientMemory)
    .where(eq(patientMemory.patient_id, patientId))
    .orderBy(patientMemory.filename);

  if (rows.length === 0) return "No prior history for this patient.";

  return rows.map((r) => `## ${r.filename}\n${r.content}`).join("\n\n---\n\n");
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
