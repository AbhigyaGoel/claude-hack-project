// Obsidian MCP client for reading/writing session data to the Obsidian vault.
// In production, this communicates with the Obsidian MCP server.
// For development, it uses local file-based storage as a fallback.

export interface SessionNote {
  patient: string;
  session: number;
  date: string;
  pain_pre: number;
  pain_post: number;
  exercises_completed: number;
  exercises_prescribed: number;
  content: string;
}

export interface PatientNote {
  id: string;
  body_region: string;
  severity_score: number;
  sessions: number;
  created: string;
}

// Storage for development mode (in-memory)
const sessionStore: Map<string, SessionNote[]> = new Map();
const patientStore: Map<string, PatientNote> = new Map();

export async function writeSessionNote(note: SessionNote): Promise<void> {
  const key = note.patient;
  const existing = sessionStore.get(key) || [];
  sessionStore.set(key, [...existing, note]);
}

export async function readPatientSessions(patientId: string): Promise<SessionNote[]> {
  return sessionStore.get(patientId) || [];
}

export async function writePatientProfile(patient: PatientNote): Promise<void> {
  patientStore.set(patient.id, patient);
}

export async function readPatientProfile(patientId: string): Promise<PatientNote | null> {
  return patientStore.get(patientId) || null;
}

export async function querySessionHistory(
  patientId: string,
  limit: number = 10,
): Promise<SessionNote[]> {
  const sessions = sessionStore.get(patientId) || [];
  return sessions.slice(-limit);
}
