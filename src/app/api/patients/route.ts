import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { patients, sessions } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const db = getDb();
  const rows = await db
    .select()
    .from(patients)
    .where(eq(patients.user_id, userId))
    .orderBy(desc(patients.created_at));

  // Count sessions per patient in one roundtrip; avoids N+1 joins
  const sessionRows = await db
    .select({ patient_id: sessions.patient_id })
    .from(sessions)
    .where(eq(sessions.user_id, userId));

  const sessionCounts = new Map<string, number>();
  for (const s of sessionRows) {
    sessionCounts.set(s.patient_id, (sessionCounts.get(s.patient_id) ?? 0) + 1);
  }

  return NextResponse.json({
    patients: rows.map((p) => ({
      id: p.id,
      name: p.name,
      profile: p.profile_json,
      created_at: p.created_at,
      session_count: sessionCounts.get(p.id) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json();
  const { name, diagnostic } = body as {
    name?: string;
    diagnostic?: Record<string, unknown>;
  };

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .insert(patients)
    .values({
      user_id: userId,
      name,
      profile_json: { name, diagnostic: diagnostic ?? null },
    })
    .returning();

  return NextResponse.json({
    id: row.id,
    name: row.name,
    profile: row.profile_json,
    created_at: row.created_at,
    session_count: 0,
  });
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = getDb();
  await db
    .delete(patients)
    .where(and(eq(patients.id, id), eq(patients.user_id, userId)));

  return NextResponse.json({ ok: true });
}
