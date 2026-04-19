import { NextResponse } from "next/server";
import { buildAgentPayload } from "@/lib/conversationalIntakeConfig";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Bump when voice/prompt config changes
const INTAKE_CONFIG_VERSION = "v4-autofill";

/** Module-level cache — survives across requests in the same Node.js process. */
let cachedAgentId: string | null = null;
let cachedConfigVersion: string | null = null;

async function getOrCreateAgent(apiKey: string): Promise<string> {
  if (cachedAgentId && cachedConfigVersion === INTAKE_CONFIG_VERSION) return cachedAgentId;

  const res = await fetch(`${ELEVENLABS_BASE}/convai/agents/create`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildAgentPayload()),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs agent creation failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedAgentId = data.agent_id as string;
  cachedConfigVersion = INTAKE_CONFIG_VERSION;
  return cachedAgentId;
}

async function getSignedUrl(apiKey: string, agentId: string): Promise<string> {
  const res = await fetch(
    `${ELEVENLABS_BASE}/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs signed URL failed: ${res.status} ${text}`);
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
    const agentId = await getOrCreateAgent(apiKey);
    const signedUrl = await getSignedUrl(apiKey, agentId);
    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error("[elevenlabs/signed-url]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
