"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { ExercisePlanItem } from "@/types/exercise";
import ExerciseDemo from "@/components/ExerciseDemo";

interface ExerciseGuideProps {
  exercise: ExercisePlanItem;
  currentAngle: number;
  targetAngle: number;
  phase: "ready" | "lifting" | "holding" | "lowering";
}

const PHASE_INSTRUCTIONS: Record<string, { label: string; color: string }> = {
  ready: { label: "Get into starting position", color: "var(--color-accent)" },
  lifting: { label: "Raise slowly", color: "var(--color-success)" },
  holding: { label: "Hold at the top", color: "var(--color-warning)" },
  lowering: { label: "Lower with control", color: "var(--color-accent)" },
};

const EXERCISE_GRAPHICS: Record<string, string> = {
  wall_slide_01: "/wall_slide_simplified.svg",
  shoulder_abduction_standing_01: "/standing_shoulder_abduction.svg",
};

export default function ExerciseGuide({
  exercise,
  currentAngle,
  targetAngle,
  phase,
}: ExerciseGuideProps) {
  const progress = targetAngle > 0 ? Math.min(100, (currentAngle / targetAngle) * 100) : 0;
  const instruction = PHASE_INSTRUCTIONS[phase];
  const graphicSrc = EXERCISE_GRAPHICS[exercise.id];
  const [showGraphic, setShowGraphic] = useState(false);

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      {/* Exercise demonstration */}
      <div className="relative">
        <ExerciseDemo
          exerciseId={exercise.id}
          exerciseName={exercise.name}
          targetAngles={exercise.target_angles}
          cues={exercise.cues}
          tempoSeconds={exercise.tempo_seconds}
        />
        {graphicSrc && (
          <button
            onClick={() => setShowGraphic(true)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
            title="View exercise graphic"
          >
            i
          </button>
        )}
      </div>

      {/* Live phase instruction */}
      <div
        className="text-center py-3 rounded-xl text-sm font-semibold animate-fade-in"
        style={{
          background: `color-mix(in srgb, ${instruction.color} 12%, transparent)`,
          color: instruction.color,
          border: `1px solid color-mix(in srgb, ${instruction.color} 25%, transparent)`,
        }}
        key={phase}
      >
        {instruction.label}
      </div>

      {/* Angle progress bar */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="data-label">Range of Motion</span>
          <span className="font-mono text-xs" style={{ color: "var(--color-text-primary)" }}>
            {Math.round(currentAngle)}° / {targetAngle}°
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-raised)" }}>
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: progress >= 90
                ? "var(--color-success)"
                : progress >= 60
                  ? "var(--color-warning)"
                  : "var(--color-accent)",
            }}
          />
        </div>
      </div>

      {/* Tempo guide */}
      <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
        <span className="data-label">Tempo</span>
        <div className="flex gap-1">
          {exercise.tempo_seconds.split("-").map((t, i) => {
            const labels = ["Up", "Hold", "Down", "Rest"];
            return (
              <div key={i} className="flex flex-col items-center px-2 py-1 rounded-md" style={{ background: "var(--color-surface-raised)" }}>
                <span className="font-mono text-xs font-semibold" style={{ color: "var(--color-accent)" }}>{t}s</span>
                <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>{labels[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graphic popup modal — portaled to body to escape stacking context */}
      {showGraphic && graphicSrc && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setShowGraphic(false)}
        >
          <div
            className="relative rounded-2xl p-8 w-full h-full max-w-5xl flex flex-col"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 shrink-0">
              <p className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {exercise.name}
              </p>
              <button
                onClick={() => setShowGraphic(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <img
              src={graphicSrc}
              alt={`${exercise.name} guide`}
              className="w-full flex-1 min-h-0 object-contain rounded-xl"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
