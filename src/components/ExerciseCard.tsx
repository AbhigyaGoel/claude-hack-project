"use client";

import type { ExercisePlanItem } from "@/types/exercise";

interface ExerciseCardProps {
  exercise: ExercisePlanItem;
  currentSet: number;
  currentRep: number;
}

export default function ExerciseCard({ exercise, currentSet, currentRep }: ExerciseCardProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {exercise.name}
        </h3>
        <div className="flex items-center gap-3 mt-2">
          {[
            { label: "Sets", value: `${currentSet}/${exercise.sets}` },
            { label: "Reps", value: `${currentRep}/${exercise.reps}` },
            { label: "Tempo", value: exercise.tempo_seconds },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="data-label">{label}</span>
              <span className="font-mono text-xs font-medium" style={{ color: "var(--color-accent)" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--color-border)" }} className="pt-3">
        <p className="data-label mb-2.5">Coaching Cues</p>
        <ul className="space-y-2 stagger-children">
          {exercise.cues.map((cue, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-mono font-semibold mt-0.5"
                style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}
              >
                {i + 1}
              </span>
              {cue}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {exercise.target_muscles.map((muscle) => (
          <span
            key={muscle}
            className="text-[10px] font-medium px-2 py-0.5 rounded-md"
            style={{ background: "var(--color-accent-glow)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
          >
            {muscle.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
