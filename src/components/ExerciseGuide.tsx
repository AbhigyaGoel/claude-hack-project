"use client";

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

export default function ExerciseGuide({
  exercise,
  currentAngle,
  targetAngle,
  phase,
}: ExerciseGuideProps) {
  const progress = Math.min(100, (currentAngle / targetAngle) * 100);
  const instruction = PHASE_INSTRUCTIONS[phase];

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      {/* Exercise demonstration */}
      <ExerciseDemo exerciseId={exercise.id} />

      {/* Live instruction */}
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
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ background: "var(--color-surface-raised)" }}
        >
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

      {/* How to do it */}
      <div>
        <p className="data-label mb-2">How to perform</p>
        <ol className="space-y-1.5">
          {exercise.cues.map((cue, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-mono font-semibold"
                style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}
              >
                {i + 1}
              </span>
              {cue}
            </li>
          ))}
        </ol>
      </div>

      {/* Tempo guide */}
      <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
        <span className="data-label">Tempo</span>
        <div className="flex gap-1">
          {exercise.tempo_seconds.split("-").map((t, i) => {
            const labels = ["Up", "Hold", "Down", "Rest"];
            return (
              <div
                key={i}
                className="flex flex-col items-center px-2 py-1 rounded-md"
                style={{ background: "var(--color-surface-raised)" }}
              >
                <span className="font-mono text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                  {t}s
                </span>
                <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
                  {labels[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
