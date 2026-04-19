import fs from "fs";
import path from "path";

const MEMORY_ROOT = path.join(process.cwd(), "patient-memory");

/**
 * Patient memory tool — file-based persistent memory per patient.
 * Each patient gets a namespace: /patient-memory/{patient_id}/
 *
 * Files Claude maintains:
 * - case_notes.md — running SOAP notes
 * - progression_history.json — exercise advancement decisions
 * - pattern_observations.md — compensations, preferences, pain triggers
 * - goals.md — functional goals + progress
 */
export function getMemoryPath(patientId: string): string {
  const dir = path.join(MEMORY_ROOT, patientId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function readMemoryFile(patientId: string, filename: string): string | null {
  const filePath = path.join(MEMORY_ROOT, patientId, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function writeMemoryFile(patientId: string, filename: string, content: string): void {
  const dir = getMemoryPath(patientId);
  fs.writeFileSync(path.join(dir, filename), content, "utf-8");
}

export function appendMemoryFile(patientId: string, filename: string, content: string): void {
  const dir = getMemoryPath(patientId);
  const filePath = path.join(dir, filename);
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  fs.writeFileSync(filePath, existing + "\n" + content, "utf-8");
}

export function listMemoryFiles(patientId: string): string[] {
  const dir = path.join(MEMORY_ROOT, patientId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir);
}

/**
 * Load all patient memory as context string for prompt injection.
 */
export function loadPatientContext(patientId: string): string {
  const files = listMemoryFiles(patientId);
  if (files.length === 0) return "No prior history for this patient.";

  const sections = files.map((f) => {
    const content = readMemoryFile(patientId, f);
    return `## ${f}\n${content}`;
  });

  return sections.join("\n\n---\n\n");
}

/**
 * Memory tool handlers for Claude tool-use.
 */
export function createMemoryToolHandlers(patientId: string) {
  return {
    read_memory: async (input: Record<string, unknown>) => {
      const filename = input.filename as string;
      const content = readMemoryFile(patientId, filename);
      return { filename, content: content ?? "File not found", exists: content !== null };
    },
    write_memory: async (input: Record<string, unknown>) => {
      const filename = input.filename as string;
      const content = input.content as string;
      writeMemoryFile(patientId, filename, content);
      return { filename, written: true };
    },
    append_memory: async (input: Record<string, unknown>) => {
      const filename = input.filename as string;
      const content = input.content as string;
      appendMemoryFile(patientId, filename, content);
      return { filename, appended: true };
    },
    list_memory: async () => {
      return { files: listMemoryFiles(patientId) };
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
