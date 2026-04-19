import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const db = getDb();
  const [row] = await db
    .select({ id: users.id, username: users.username, created_at: users.created_at })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user: row });
}
