import { NextRequest } from "next/server";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian

export async function POST(req: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ELEVENLABS API key not configured" }), { status: 500 });
  }

  const { text, voiceId, stability = 0.5, similarityBoost = 0.75, speed = 1.15, rage = false } = (await req.json()) as {
    text: string;
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
    speed?: number;
    rage?: boolean;
  };

  if (!text) {
    return new Response(JSON.stringify({ error: "text is required" }), { status: 400 });
  }

  const RAGE_OPENERS = [
    "WHAT IN THE ABSOLUTE FUCK ARE YOU DOING, YOU USELESS PIECE OF SHIT?! ",
    "HOLY FUCKING SHIT, ARE YOU ACTUALLY THIS GODDAMN STUPID?! ",
    "JESUS FUCKING CHRIST, I CANNOT BELIEVE WHAT I'M SEEING, YOU INCOMPETENT ASSHOLE! ",
    "WHAT THE FUCK IS WRONG WITH YOU?! ARE YOU BRAIN DEAD?! ",
    "OH MY GOD YOU ARE SO FUCKING PATHETIC, I WANT TO SCREAM! ",
    "ARE YOU SHITTING ME RIGHT NOW?! THIS IS THE DUMBEST BULLSHIT I'VE EVER SEEN! ",
    "FUCK YOU AND YOUR BULLSHIT, YOU ABSOLUTE WASTE OF OXYGEN! ",
    "I SWEAR TO GOD IF YOU DON'T GET YOUR SHIT TOGETHER I AM GOING TO LOSE MY FUCKING MIND! ",
  ];
  const RAGE_CLOSERS = [
    " NOW GET YOUR SHIT TOGETHER, YOU MISERABLE BASTARD!!",
    " DO YOU HEAR ME, YOU PATHETIC EXCUSE FOR A HUMAN BEING?!",
    " STOP BEING SUCH A FUCKING DISAPPOINTMENT!!",
    " GET IT THE FUCK TOGETHER OR GET THE FUCK OUT!!",
    " FIGURE IT OUT, YOU BRAINLESS FUCKING MORON!!",
  ];

  const finalText = rage
    ? RAGE_OPENERS[Math.floor(Math.random() * RAGE_OPENERS.length)] +
      text.toUpperCase() +
      RAGE_CLOSERS[Math.floor(Math.random() * RAGE_CLOSERS.length)]
    : text;

  const voiceSettings = rage
    ? { stability: 0.1, similarity_boost: 1.0, speed: 1.2, style: 1.0, use_speaker_boost: true }
    : { stability, similarity_boost: similarityBoost, speed: Math.max(0.7, Math.min(1.2, speed)) };

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
        text: finalText,
        model_id: "eleven_flash_v2_5",
        voice_settings: voiceSettings,
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
