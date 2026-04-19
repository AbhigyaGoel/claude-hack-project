import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { narratorLog } from "@/db/schema";

/**
 * Canonical log of every Claude-as-PT observation / decision / response.
 *
 * Anywhere Claude produces text in a clinical role (intake reasoning, plan
 * rationale, chat reply, session report summary, per-rep form critique) we
 * write it here. The chat RAG reads the recent rows as part of patient
 * context, so adding entries strengthens every future conversation.
 */

export type PtLogSource =
  | "intake"
  | "plan"
  | "chat"
  | "report"
  | "rep_analysis"
  | "narrator"
  | "safety";

export interface LogCommentaryInput {
  patientId: string | null;
  source: PtLogSource;
  text: string;
  sessionId?: string | null;
  tMs?: number;
}

/**
 * Insert one row. Never throws — logging is best-effort and must not break
 * the main request path.
 */
export async function logPtCommentary(input: LogCommentaryInput): Promise<void> {
  const text = input.text?.trim();
  if (!text) return;

  try {
    const db = getDb();
    await db.insert(narratorLog).values({
      patient_id: input.patientId ?? null,
      session_id: input.sessionId ?? null,
      source: input.source,
      t_ms: input.tMs ?? 0,
      reasoning_text: text,
    });
  } catch (err) {
    console.error("[ptLog] failed to insert commentary:", err);
  }
}

/**
 * Load the most recent commentary rows for a patient — used by the chat
 * RAG context builder.
 */
export async function loadRecentPtCommentary(
  patientId: string,
  limit: number = 20,
): Promise<
  Array<{
    source: PtLogSource;
    text: string;
    created_at: Date | null;
    session_id: string | null;
  }>
> {
  const db = getDb();
  const rows = await db
    .select({
      source: narratorLog.source,
      text: narratorLog.reasoning_text,
      created_at: narratorLog.created_at,
      session_id: narratorLog.session_id,
    })
    .from(narratorLog)
    .where(eq(narratorLog.patient_id, patientId))
    .orderBy(desc(narratorLog.created_at))
    .limit(limit);
  return rows.map((r) => ({
    source: r.source as PtLogSource,
    text: r.text,
    created_at: r.created_at,
    session_id: r.session_id,
  }));
}
