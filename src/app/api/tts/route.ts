import { NextRequest } from "next/server";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian

/**
 * Server-side TTS proxy — keeps the ElevenLabs API key out of the browser.
 * Accepts { text, voiceId?, stability?, similarityBoost? }
 * Returns raw audio/mpeg bytes.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ELEVENLABS API key not configured" }), { status: 500 });
  }

  const {
    text,
    voiceId,
    stability = 0.5,
    similarityBoost = 0.75,
    // Speed is clamped to ElevenLabs' supported range [0.7, 1.2].
    // Default of 1.15 is noticeably snappier than 1.0 without sounding alien
    // and pairs well with the observer's short one-line cues.
    speed = 1.15,
  } = (await req.json()) as {
    text: string;
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
    speed?: number;
  };

  if (!text) {
    return new Response(JSON.stringify({ error: "text is required" }), { status: 400 });
  }

  const clampedSpeed = Math.max(0.7, Math.min(1.2, speed));

  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId ?? DEFAULT_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          speed: clampedSpeed,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[/api/tts] ElevenLabs ${response.status}:`, detail);
    return new Response(
      JSON.stringify({ error: `ElevenLabs TTS failed: ${response.status}`, detail }),
      { status: response.status },
    );
  }

  const audio = await response.arrayBuffer();
  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
