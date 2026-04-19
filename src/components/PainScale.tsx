"use client";

import { useState } from "react";

interface PainScaleProps {
  label: string;
  onSelect: (value: number) => void;
  initialValue?: number;
}

function getColor(value: number): string {
  if (value <= 2) return "var(--color-success)";
  if (value <= 4) return "#a3e635";
  if (value <= 6) return "var(--color-warning)";
  if (value <= 8) return "#f97316";
  return "var(--color-danger)";
}

function getBgColor(value: number): string {
  if (value <= 2) return "var(--color-success-dim)";
  if (value <= 4) return "rgba(163, 230, 53, 0.12)";
  if (value <= 6) return "var(--color-warning-dim)";
  if (value <= 8) return "rgba(249, 115, 22, 0.12)";
  return "var(--color-danger-dim)";
}

export default function PainScale({ label, onSelect, initialValue }: PainScaleProps) {
  const [selected, setSelected] = useState<number | undefined>(initialValue);

  function handleSelect(value: number) {
    setSelected(value);
    onSelect(value);
  }

  return (
    <div className="glass-card-bright p-8 max-w-lg mx-auto">
      <p className="text-base font-medium mb-6 text-center" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </p>

      {/* Selected number display */}
      <div className="text-center mb-6">
        <span
          className="text-6xl font-light font-mono transition-all duration-300"
          style={{ color: selected !== undefined ? getColor(selected) : "var(--color-text-muted)" }}
        >
          {selected !== undefined ? selected : "—"}
        </span>
      </div>

      {/* Scale buttons */}
      <div className="flex gap-2 justify-center mb-3">
        {Array.from({ length: 11 }, (_, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className="relative w-10 h-10 rounded-xl text-sm font-mono font-medium transition-all duration-200"
              style={{
                background: isSelected ? getBgColor(i) : "var(--color-surface-raised)",
                color: isSelected ? getColor(i) : "var(--color-text-muted)",
                border: `1px solid ${isSelected ? getColor(i) : "var(--color-border)"}`,
                boxShadow: isSelected ? `0 0 16px ${getBgColor(i)}` : "none",
                transform: isSelected ? "scale(1.1)" : "scale(1)",
              }}
            >
              {i}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-xs font-medium px-1" style={{ color: "var(--color-text-muted)" }}>
        <span>No pain</span>
        <span>Worst imaginable</span>
      </div>
    </div>
  );
}
