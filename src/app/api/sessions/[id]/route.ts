import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

/**
 * DELETE /api/sessions/{id}
 *
 * Removes a session owned by the current user. Cascades to sets,
 * rep_analyses, form_events, red_flags, and narrator_log via the schema's
 * ON DELETE CASCADE.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  const result = await db
    .delete(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.user_id, userId)))
    .returning({ id: sessions.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
