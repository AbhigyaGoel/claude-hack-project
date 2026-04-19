import { NextRequest, NextResponse } from "next/server";
import { analyzeRep } from "@/agents/formCritic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await analyzeRep(body);
  return NextResponse.json(result);
}
