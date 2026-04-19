"use client";

import type { RepQuality } from "@/types/assessment";

interface RepCounterProps {
  currentRep: number;
  totalReps: number;
  currentSet: number;
  totalSets: number;
  lastRepQuality?: RepQuality;
  currentAngle?: number;
  targetAngle?: number;
}

const QUALITY_CONFIG: Record<RepQuality, { color: string; bg: string; label: string }> = {
  green: { color: "var(--color-success)", bg: "var(--color-success-dim)", label: "Good Form" },
  yellow: { color: "var(--color-warning)", bg: "var(--color-warning-dim)", label: "Needs Correction" },
  red: { color: "var(--color-danger)", bg: "var(--color-danger-dim)", label: "Poor Form" },
};

export default function RepCounter({
  currentRep,
  totalReps,
  currentSet,
  totalSets,
  lastRepQuality,
  currentAngle,
  targetAngle,
}: RepCounterProps) {
  const progress = totalReps > 0 ? (currentRep / totalReps) * 100 : 0;
  const quality = lastRepQuality ? QUALITY_CONFIG[lastRepQuality] : null;

  return (
    <div className="glass-card-bright p-5 flex flex-col items-center gap-4">
      {/* Circular progress + rep number */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Background ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>

        <div className="text-center relative z-10">
          <div className="text-4xl font-semibold font-mono" style={{ color: "var(--color-text-primary)" }}>
            {currentRep}
          </div>
          <div className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
            of {totalReps}
          </div>
        </div>
      </div>

      {/* Set indicator */}
      <div className="flex gap-1.5">
        {Array.from({ length: totalSets }, (_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i + 1 === currentSet ? 24 : 8,
              background: i + 1 < currentSet
                ? "var(--color-accent)"
                : i + 1 === currentSet
                  ? "var(--color-accent)"
                  : "var(--color-border)",
              opacity: i + 1 <= currentSet ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <span className="data-label">Set {currentSet} of {totalSets}</span>

      {/* Quality badge */}
      {quality && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium animate-fade-in-scale"
          style={{ background: quality.bg, color: quality.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: quality.color }}
          />
          {quality.label}
        </div>
      )}

      {/* Angle readout */}
      {currentAngle !== undefined && targetAngle !== undefined && (
        <div className="flex items-baseline gap-1 font-mono text-sm">
          <span style={{ color: "var(--color-text-primary)" }}>{Math.round(currentAngle)}°</span>
          <span style={{ color: "var(--color-text-muted)" }}>/</span>
          <span style={{ color: "var(--color-text-muted)" }}>{targetAngle}°</span>
        </div>
      )}
    </div>
  );
}
