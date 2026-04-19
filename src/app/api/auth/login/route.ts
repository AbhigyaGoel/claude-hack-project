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

  const db = getDb();
  const [row] = await db
    .select({ id: users.id, username: users.username, password: users.password })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!row || row.password !== password) {
    return NextResponse.json({ error: "invalid username or password" }, { status: 401 });
  }

  await setSessionCookie(row.id);
  return NextResponse.json({ id: row.id, username: row.username });
}
