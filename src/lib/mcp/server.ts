/**
 * Vero MCP Server — exposes patient data and plan management
 * for human PTs supervising via Claude Desktop.
 *
 * Tools exposed:
 * - get_patient_summary(patient_id)
 * - get_session_history(patient_id)
 * - get_form_events(session_id)
 * - override_plan(patient_id, plan)
 */

import { getDb } from "@/db";
import { patients, plans, sessions, sets, formEvents, redFlags } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const MCP_TOOLS: MCPTool[] = [
  {
    name: "get_patient_summary",
    description: "Get a patient's profile, diagnostic results, and current plan. Use to review a patient before their session.",
    inputSchema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "Patient ID" },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_session_history",
    description: "Get all sessions for a patient with pain trends, form quality, and exercise data. Use to review longitudinal progress.",
    inputSchema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "Patient ID" },
        last_n: { type: "number", description: "Number of recent sessions (default: all)" },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_form_events",
    description: "Get all form faults and cues for a specific session. Use to review exercise quality in detail.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Session ID" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "override_plan",
    description: "Override the active exercise plan for a patient. Use when the PT wants to manually adjust the program.",
    inputSchema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "Patient ID" },
        plan_json: { type: "string", description: "New plan as JSON string" },
        reason: { type: "string", description: "Clinical reason for override" },
      },
      required: ["patient_id", "plan_json"],
    },
  },
  {
    name: "get_red_flags",
    description: "Get all red flag events for a patient across sessions. Use to review safety incidents.",
    inputSchema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "Patient ID" },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "list_patients",
    description: "List all patients with basic info. Use to get an overview of the caseload.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

export async function handleMCPToolCall(
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const db = getDb();

  switch (toolName) {
    case "list_patients": {
      const rows = await db.select().from(patients);
      return rows.map((r) => ({
        id: r.id,
        profile: r.profile_json,
        created_at: r.created_at,
      }));
    }

    case "get_patient_summary": {
      const patientId = input.patient_id as string;
      const patientRows = await db.select().from(patients).where(eq(patients.id, patientId));
      if (patientRows.length === 0) return { error: "Patient not found" };

      const activePlan = await db
        .select()
        .from(plans)
        .where(eq(plans.patient_id, patientId))
        .orderBy(desc(plans.created_at))
        .limit(1);

      const sessionCount = await db
        .select()
        .from(sessions)
        .where(eq(sessions.patient_id, patientId));

      return {
        patient: patientRows[0].profile_json,
        created_at: patientRows[0].created_at,
        active_plan: activePlan[0]?.plan_json ?? null,
        total_sessions: sessionCount.length,
      };
    }

    case "get_session_history": {
      const patientId = input.patient_id as string;
      const lastN = (input.last_n as number) || 100;

      const sessionRows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.patient_id, patientId))
        .orderBy(desc(sessions.started_at))
        .limit(lastN);

      const result = [];
      for (const session of sessionRows) {
        const sessionSets = await db
          .select()
          .from(sets)
          .where(eq(sets.session_id, session.id));

        result.push({
          id: session.id,
          started_at: session.started_at,
          ended_at: session.ended_at,
          pain_pre: session.pain_pre,
          pain_post: session.pain_post,
          summary: session.summary_json ?? null,
          exercises: sessionSets.map((s) => ({
            name: s.exercise_name,
            set_number: s.set_number,
            reps: s.reps,
            form_score: s.form_score,
          })),
        });
      }

      return result;
    }

    case "get_form_events": {
      const sessionId = input.session_id as string;
      const sessionSets = await db
        .select()
        .from(sets)
        .where(eq(sets.session_id, sessionId));

      const result = [];
      for (const set of sessionSets) {
        const events = await db
          .select()
          .from(formEvents)
          .where(eq(formEvents.set_id, set.id));

        result.push({
          exercise: set.exercise_name,
          set_number: set.set_number,
          reps: set.reps,
          form_score: set.form_score,
          events: events.map((e) => ({
            t_ms: e.t_ms,
            fault: e.fault,
            severity: e.severity,
            cue_sent: e.cue_sent,
          })),
        });
      }

      return result;
    }

    case "get_red_flags": {
      const patientId = input.patient_id as string;
      const patientSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.patient_id, patientId));

      const flags = [];
      for (const session of patientSessions) {
        const sessionFlags = await db
          .select()
          .from(redFlags)
          .where(eq(redFlags.session_id, session.id));
        flags.push(
          ...sessionFlags.map((f) => ({
            session_id: session.id,
            session_date: session.started_at,
            type: f.type,
            transcript: f.transcript,
            halted: f.halted,
            referred: f.referred,
          })),
        );
      }

      return flags;
    }

    case "override_plan": {
      const patientId = input.patient_id as string;
      const planJson = input.plan_json as string;
      const reason = (input.reason as string) || "PT override";

      // Deactivate existing plans
      await db
        .update(plans)
        .set({ active: false })
        .where(eq(plans.patient_id, patientId));

      // Parse the incoming plan payload — MCP passes it as a JSON string
      let parsedPlan: unknown;
      try {
        parsedPlan = JSON.parse(planJson);
      } catch {
        parsedPlan = planJson;
      }

      // Insert new plan (id generated by DB default)
      const [row] = await db
        .insert(plans)
        .values({
          patient_id: patientId,
          plan_json: parsedPlan as Record<string, unknown>,
          active: true,
          citations_json: { override_reason: reason },
        })
        .returning({ id: plans.id });

      return { plan_id: row.id, status: "Plan overridden", reason };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
