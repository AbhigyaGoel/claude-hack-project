import { NextResponse } from "next/server";
import { buildCoachAgentPayload } from "@/lib/coachAgentConfig";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

let cachedAgentId: string | null = null;

async function getOrCreateCoachAgent(apiKey: string): Promise<string> {
  if (cachedAgentId) return cachedAgentId;

  const res = await fetch(`${ELEVENLABS_BASE}/convai/agents/create`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(buildCoachAgentPayload()),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coach agent creation failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedAgentId = data.agent_id as string;
  return cachedAgentId;
}

async function getSignedUrl(apiKey: string, agentId: string): Promise<string> {
  const res = await fetch(
    `${ELEVENLABS_BASE}/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coach signed URL failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.signed_url as string;
}

export async function POST() {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NEXT_PUBLIC_ELEVENLABS_API_KEY not set" }, { status: 500 });
  }

  try {
    const agentId = await getOrCreateCoachAgent(apiKey);
    const signedUrl = await getSignedUrl(apiKey, agentId);
    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error("[coach-signed-url]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
