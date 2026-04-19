const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export interface TTSConfig {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
}

const DEFAULT_CONFIG: TTSConfig = {
  voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel — default voice
  modelId: "eleven_flash_v2_5",
  stability: 0.5,
  similarityBoost: 0.75,
};

export async function textToSpeech(
  text: string,
  config: Partial<TTSConfig> = {},
): Promise<ArrayBuffer> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_ELEVENLABS_API_KEY is not set");
  }

  const { voiceId, modelId, stability, similarityBoost } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
    );
  }

  return response.arrayBuffer();
}

/**
 * Cancellable audio playback handle.
 * Call stop() to immediately halt playback and resolve the promise.
 */
export interface PlaybackHandle {
  /** Resolves when playback finishes or is stopped. */
  readonly finished: Promise<void>;
  /** Stop playback immediately. */
  stop: () => void;
}

export function playAudioBufferCancellable(audioBuffer: ArrayBuffer): PlaybackHandle {
  const audioContext = new AudioContext();
  let stopped = false;

  const finished = audioContext.decodeAudioData(audioBuffer.slice(0)).then(
    (decodedAudio) => {
      if (stopped) {
        audioContext.close();
        return;
      }

      const source = audioContext.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContext.destination);

      return new Promise<void>((resolve) => {
        source.onended = () => {
          audioContext.close();
          resolve();
        };
        source.start(0);

        // Store stop callback so handle.stop() can call it
        handle.stop = () => {
          if (!stopped) {
            stopped = true;
            try {
              source.stop();
            } catch {
              // already stopped
            }
            audioContext.close();
            resolve();
          }
        };
      });
    },
  );

  const handle: PlaybackHandle = {
    finished,
    stop: () => {
      stopped = true;
      // If decoding hasn't finished yet, the flag will prevent playback
    },
  };

  return handle;
}

/**
 * Non-blocking speak: fetches TTS audio and plays it.
 * Returns a PlaybackHandle so the caller can stop playback early.
 * The onSpeakingChange callback fires when speech starts/stops.
 */
export function speakNonBlocking(
  text: string,
  onSpeakingChange?: (speaking: boolean) => void,
  config: Partial<TTSConfig> = {},
): PlaybackHandle {
  let cancelled = false;
  let innerHandle: PlaybackHandle | null = null;

  const finished = (async () => {
    try {
      const audio = await textToSpeech(text, config);
      if (cancelled) return;

      onSpeakingChange?.(true);
      innerHandle = playAudioBufferCancellable(audio);
      await innerHandle.finished;
    } catch (err) {
      console.error("TTS playback error:", err);
    } finally {
      onSpeakingChange?.(false);
    }
  })();

  return {
    finished,
    stop: () => {
      cancelled = true;
      innerHandle?.stop();
    },
  };
}

// Legacy helpers kept for backward compatibility

export async function playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
  const handle = playAudioBufferCancellable(audioBuffer);
  await handle.finished;
}

export async function speakCoachingCue(text: string): Promise<void> {
  const audio = await textToSpeech(text);
  await playAudioBuffer(audio);
}
