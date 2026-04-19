"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PatientRecord, SessionRecord } from "@/types/storage";
import {
  getActivePatient,
  clearActivePatient,
  getCurrentUser,
  logout,
  listSessions,
} from "@/lib/api";
import { focusForSession } from "@/lib/focusFromExercises";

interface FocusEntry {
  focus: string;
  count: number;
  lastDate: string | null;
  lastPainPost: number | null;
}

function focusColor(focus: string): string {
  switch (focus.toLowerCase()) {
    case "knee":
      return "#38bdc3";
    case "shoulder":
      return "#a78bfa";
    case "lumbar":
      return "#f97316";
    case "integrated":
      return "#22c55e";
    default:
      return "var(--color-accent)";
  }
}

export default function Home() {
  const [profile, setProfile] = useState<PatientRecord | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [focuses, setFocuses] = useState<FocusEntry[]>([]);
  // Single loading flag so the page doesn't flash through the
  // unauthenticated → patient-only → full-picker states while the
  // individual fetches resolve one-by-one.
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [user, p] = await Promise.all([
          getCurrentUser().catch(() => null),
          getActivePatient().catch(() => null),
        ]);
        if (cancelled) return;
        setUsername(user?.username ?? null);
        setProfile(p);

        if (p) {
          const sessions = await listSessions(p.id).catch(() => [] as SessionRecord[]);
          if (cancelled) return;
          const byFocus = new Map<string, FocusEntry>();
          for (const s of sessions) {
            const f = focusForSession(s);
            if (!f) continue;
            const existing = byFocus.get(f);
            if (!existing) {
              byFocus.set(f, {
                focus: f,
                count: 1,
                lastDate: s.date,
                lastPainPost: s.pain_post ?? null,
              });
            } else {
              existing.count += 1;
              if (s.date && (!existing.lastDate || s.date > existing.lastDate)) {
                existing.lastDate = s.date;
                existing.lastPainPost = s.pain_post ?? null;
              }
            }
          }
          setFocuses(
            Array.from(byFocus.values()).sort((a, b) =>
              (b.lastDate ?? "").localeCompare(a.lastDate ?? ""),
            ),
          );
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  async function handleLogout() {
    clearActivePatient();
    await logout();
    window.location.href = "/login";
  }

  return (
    <main className="flex-1 flex items-center justify-center relative overflow-hidden">
      {/* Signed-in chip — top-right */}
      {username && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <span
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            @{username}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
            style={{
              background: "transparent",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
      )}

      {/* Background radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(56,189,195,0.06) 0%, rgba(56,189,195,0.02) 40%, transparent 70%)",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(56,189,195,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,195,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="text-center max-w-2xl px-6 relative z-10 animate-fade-in">
        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 rounded-2xl glass-card-bright flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L8 8V16L16 28L24 16V8L16 4Z" stroke="#38bdc3" strokeWidth="1.5" fill="rgba(56,189,195,0.1)"/>
              <circle cx="16" cy="14" r="3" stroke="#38bdc3" strokeWidth="1.5" fill="none"/>
              <path d="M13 18L16 24L19 18" stroke="#38bdc3" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <h1 className="text-6xl font-light tracking-tight mb-2" style={{ color: "var(--color-text-primary)" }}>
          Vero
        </h1>
        <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: "var(--color-accent)" }}>
          AI Physical Therapy
        </p>
        <p className="text-lg font-light leading-relaxed mb-8" style={{ color: "var(--color-text-secondary)" }}>
          Real-time pose estimation, personalized exercise programming,
          and adaptive coaching — all in your browser.
        </p>

        {/* Active profile badge */}
        {!bootstrapping && profile && (
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-success)" }} />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                {profile.name}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                · {profile.session_count} session{profile.session_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Pain-point picker — one "Continue" card per focus present in
            the patient's history, plus a "New pain point" card that routes
            the session into a fresh intake. New users land on the same
            structure with only the New card visible. While bootstrapping,
            show a spinner in the CTA slot to avoid flashing through
            intermediate render states. */}
        {bootstrapping ? (
          <div className="flex justify-center py-4">
            <div className="spinner" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div
              className={
                focuses.length === 0
                  ? "flex justify-center"
                  : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              }
            >
              {focuses.map((f) => {
                const color = focusColor(f.focus);
                return (
                  <Link
                    key={f.focus}
                    href={`/session?focus=${encodeURIComponent(f.focus)}`}
                    className="glass-card p-5 text-left hover:border-[var(--color-border-bright)] transition-colors"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <div
                      className="text-[11px] uppercase tracking-[0.15em] mb-2"
                      style={{ color }}
                    >
                      Continue
                    </div>
                    <div
                      className="text-xl font-semibold capitalize mb-1"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {f.focus}
                    </div>
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {f.count} session{f.count === 1 ? "" : "s"}
                      {f.lastDate
                        ? ` · last ${new Date(f.lastDate).toLocaleDateString()}`
                        : ""}
                      {f.lastPainPost != null ? ` · pain ${f.lastPainPost}/10` : ""}
                    </div>
                  </Link>
                );
              })}

              <Link
                href="/session?new=1"
                className={`glass-card p-5 text-left hover:border-[var(--color-border-bright)] transition-colors flex flex-col justify-center${
                  focuses.length === 0 ? " w-full max-w-sm" : ""
                }`}
                style={{ borderLeft: "3px dashed var(--color-accent)" }}
              >
                <div
                  className="text-[11px] uppercase tracking-[0.15em] mb-2"
                  style={{ color: "var(--color-accent)" }}
                >
                  {focuses.length === 0 ? "Get started" : "Something else"}
                </div>
                <div
                  className="text-xl font-semibold mb-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {focuses.length === 0 ? "Start your first intake" : "New pain point"}
                </div>
                <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {focuses.length === 0
                    ? "Vero will screen you and build your first program"
                    : "Run a fresh intake for a different region"}
                </div>
              </Link>
            </div>

            <div className="flex gap-4 justify-center">
              <Link href="/progress" className="btn-ghost text-base">
                View Progress
              </Link>
              {profile && (
                <Link href="/chat" className="btn-ghost text-base">
                  Chat
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Feature pills */}
        <div className="flex gap-3 justify-center mt-16 flex-wrap">
          {["Multi-Agent Swarm", "Clinical Narrator", "Safety Monitor", "MediaPipe Pose", "Voice Coaching", "Adaptive Music"].map((feature) => (
            <span
              key={feature}
              className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{
                background: "var(--color-accent-dim)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-border)",
              }}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
