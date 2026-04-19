import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { patients, sessions } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const db = getDb();
  const [row] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.user_id, userId)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const sessionCount = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.patient_id, id), eq(sessions.user_id, userId)));

  return NextResponse.json({
    id: row.id,
    name: row.name,
    profile: row.profile_json,
    created_at: row.created_at,
    session_count: sessionCount.length,
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const db = getDb();
  await db
    .delete(patients)
    .where(and(eq(patients.id, id), eq(patients.user_id, userId)));

  return NextResponse.json({ ok: true });
}
