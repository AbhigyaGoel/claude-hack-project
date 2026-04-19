import { NextRequest, NextResponse } from "next/server";
import { checkSafety } from "@/agents/safetyMonitor";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await checkSafety(body);
  return NextResponse.json(result);
}
