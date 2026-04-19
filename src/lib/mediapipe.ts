import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_PATH = "/models/pose_landmarker_lite.task";

let cachedLandmarker: PoseLandmarker | null = null;
let lastTimestamp = -1;

export async function initializePoseLandmarker(): Promise<PoseLandmarker> {
  if (cachedLandmarker) return cachedLandmarker;

  // TFLite WASM emits "INFO: Created TensorFlow Lite XNNPACK delegate for CPU."
  // via console.error — suppress it so Next.js dev overlay doesn't flag it.
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO:")) return;
    originalError.apply(console, args);
  };

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

  cachedLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });

  console.error = originalError;

  return cachedLandmarker;
}

export function detectPose(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  timestamp: number,
) {
  // detectForVideo requires strictly increasing timestamps
  if (timestamp <= lastTimestamp) {
    timestamp = lastTimestamp + 1;
  }
  lastTimestamp = timestamp;
  return landmarker.detectForVideo(video, timestamp);
}
