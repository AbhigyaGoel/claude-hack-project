import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }
  if (username.length < 2 || username.length > 32) {
    return NextResponse.json({ error: "username must be 2–32 characters" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "username already taken" }, { status: 409 });
  }

  const [row] = await db
    .insert(users)
    .values({ username, password })
    .returning({ id: users.id, username: users.username });

  await setSessionCookie(row.id);
  return NextResponse.json({ id: row.id, username: row.username });
}
