import type {
  PatientRecord,
  SessionRecord,
  ExerciseResult,
} from "@/types/storage";
import type { DiagnosticResult } from "@/types/patient";

/**
 * Browser-side API client. Every call hits a Next.js route handler which
 * talks to Postgres via the server Drizzle client. No localStorage, no
 * direct DB access from the browser.
 *
 * The ActivePatient helper is the one piece of client-only state: it stores
 * the currently-selected patient id in sessionStorage so a refresh keeps
 * the same patient selected without round-tripping through URL params.
 */

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function listPatients(): Promise<PatientRecord[]> {
  const res = await fetch("/api/patients", { cache: "no-store" });
  const data = await asJson<{ patients: PatientRecord[] }>(res);
  return data.patients;
}

export async function getPatient(id: string): Promise<PatientRecord | null> {
  const res = await fetch(`/api/patients/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  return asJson<PatientRecord>(res);
}

export async function createPatient(
  name: string,
  diagnostic?: DiagnosticResult | null,
): Promise<PatientRecord> {
  const res = await fetch("/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, diagnostic: diagnostic ?? null }),
  });
  return asJson<PatientRecord>(res);
}

export async function deletePatient(id: string): Promise<void> {
  const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete patient ${id}`);
}

export async function listSessions(patientId: string): Promise<SessionRecord[]> {
  const res = await fetch(`/api/sessions?patient_id=${patientId}`, {
    cache: "no-store",
  });
  const data = await asJson<{ sessions: SessionRecord[] }>(res);
  return data.sessions;
}

interface SaveSessionInput {
  /**
   * If present, finalize an existing session (created at start via
   * startSession()) instead of creating a new one. Ensures rep_commentary
   * rows written mid-workout stay linked by session_id.
   */
  id?: string;
  patient_id: string;
  plan_id?: string | null;
  started_at: string;
  ended_at: string;
  pain_pre: number | null;
  pain_post: number | null;
  exercises: ExerciseResult[];
  summary?: Record<string, unknown> | null;
}

export async function saveSession(input: SaveSessionInput): Promise<{ id: string }> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return asJson<{ id: string }>(res);
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? "delete failed");
  }
}

/**
 * Create an empty session row at workout start. Returns the row's UUID so
 * subsequent per-rep writes can reference it via session_id.
 */
export async function startSession(input: {
  patient_id: string;
  plan_id?: string | null;
  pain_pre?: number | null;
  focus?: string | null;
}): Promise<{ id: string; started_at: string | null }> {
  const res = await fetch("/api/sessions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return asJson<{ id: string; started_at: string | null }>(res);
}

// --- Auth ---

export interface CurrentUser {
  id: string;
  username: string;
  created_at?: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return (data?.user as CurrentUser | null) ?? null;
}

export async function login(username: string, password: string): Promise<CurrentUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return asJson<CurrentUser>(res);
}

export async function signup(username: string, password: string): Promise<CurrentUser> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return asJson<CurrentUser>(res);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

// --- Active patient selection (client UI state only) ---

const ACTIVE_KEY = "vero:activePatientId";

export function getActivePatientId(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ACTIVE_KEY);
}

export function setActivePatientId(id: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ACTIVE_KEY, id);
}

export function clearActivePatient(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ACTIVE_KEY);
}

/**
 * Resolve the active patient, falling back to the first patient in the
 * account if no explicit selection has been made. Returns null only when
 * the account has no patients at all (caller should send user to intake).
 */
export async function getActivePatient(): Promise<PatientRecord | null> {
  const id = getActivePatientId();
  if (id) {
    const found = await getPatient(id);
    if (found) return found;
    clearActivePatient();
  }
  const all = await listPatients();
  if (all.length === 0) return null;
  const first = all[0];
  setActivePatientId(first.id);
  return first;
}
