"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { initializePoseLandmarker, detectPose } from "@/lib/mediapipe";
import { drawSkeleton, drawAngleLabel } from "@/lib/skeletonRenderer";
import { calculateAllAngles } from "@/lib/angleCalculator";
import { createLandmarkSmoother } from "@/lib/landmarkSmoother";
import type { Landmark, JointColorMap } from "@/types/landmark";

interface WebcamViewProps {
  onLandmarksDetected?: (landmarks: Landmark[], angles: Record<string, number>) => void;
  onVideoReady?: (video: HTMLVideoElement) => void;
  jointColors?: JointColorMap;
  showAngles?: boolean;
}

export default function WebcamView({
  onLandmarksDetected,
  onVideoReady,
  jointColors,
  showAngles = false,
}: WebcamViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  const onLandmarksRef = useRef(onLandmarksDetected);
  onLandmarksRef.current = onLandmarksDetected;
  const jointColorsRef = useRef(jointColors);
  jointColorsRef.current = jointColors;
  const showAnglesRef = useRef(showAngles);
  showAnglesRef.current = showAngles;

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    const smoother = createLandmarkSmoother();

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !canvas || !landmarker || video.readyState < 2) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();

      try {
        const result = detectPose(landmarker, video, now);

        if (result.landmarks && result.landmarks.length > 0) {
          const raw = result.landmarks[0] as Landmark[];
          const landmarks = smoother.smooth(raw);

          drawSkeleton(ctx, landmarks, canvas.width, canvas.height, jointColorsRef.current);

          const angles = calculateAllAngles(landmarks);
          onLandmarksRef.current?.(landmarks, angles);

          if (showAnglesRef.current) {
            // Show the most relevant non-trivial angles on the overlay
            // Cervical angles displayed at nose landmark
            if (angles.cervical_flexion > 3) {
              drawAngleLabel(ctx, landmarks[0], angles.cervical_flexion, canvas.width, canvas.height);
            }
            // Show shoulder angles only if arms are raised significantly
            if (angles.left_shoulder_flexion > 25) {
              drawAngleLabel(ctx, landmarks[11], angles.left_shoulder_flexion, canvas.width, canvas.height);
            }
            if (angles.right_shoulder_flexion > 25) {
              drawAngleLabel(ctx, landmarks[12], angles.right_shoulder_flexion, canvas.width, canvas.height);
            }
            // Show knee angles only if legs are bent
            if (angles.left_knee_flexion < 160) {
              drawAngleLabel(ctx, landmarks[25], 180 - angles.left_knee_flexion, canvas.width, canvas.height);
            }
          }
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } catch {
        // Skip frame on detection error
      }

      frameCountRef.current++;
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafId = requestAnimationFrame(loop);
    }

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        onVideoReady?.(video);

        const landmarker = await initializePoseLandmarker();
        if (cancelled) {
          return;
        }

        landmarkerRef.current = landmarker;
        setIsLoading(false);
        lastTimeRef.current = performance.now();
        rafId = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setError("Camera access required for pose detection.");
        } else if (err instanceof DOMException && err.name === "NotFoundError") {
          setError("No camera detected.");
        } else {
          setError(`Initialization failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        setIsLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full glass-card p-10">
        <div className="text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--color-danger-dim)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </div>
          <p className="text-base font-medium mb-2" style={{ color: "var(--color-danger)" }}>{error}</p>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>Grant camera permissions and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden webcam-glow" style={{ border: "1px solid var(--color-border-bright)" }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: "var(--color-surface)" }}>
          <div className="text-center animate-fade-in">
            <div className="spinner mx-auto mb-5" />
            <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Initializing pose detection
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Loading MediaPipe model...
            </p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        style={{ transform: "scaleX(-1)", background: "#000" }}
        playsInline
        muted
      />

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-contain"
        style={{ transform: "scaleX(-1)" }}
      />

      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(6,10,14,0.4) 100%)" }}
      />

      <div
        className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-mono font-medium z-10"
        style={{
          background: "rgba(6,10,14,0.7)",
          border: "1px solid var(--color-border)",
          color: fps >= 25 ? "var(--color-success)" : fps >= 15 ? "var(--color-warning)" : "var(--color-danger)",
          backdropFilter: "blur(8px)",
        }}
      >
        {fps} fps
      </div>

      {!isLoading && (
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 z-10"
          style={{
            background: "rgba(6,10,14,0.7)",
            border: "1px solid var(--color-border)",
            color: "var(--color-success)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
}
