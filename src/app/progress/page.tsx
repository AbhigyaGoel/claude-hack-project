"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProgressChart from "@/components/ProgressChart";
import type { PatientRecord, SessionRecord } from "@/types/storage";
import type { ChartDataPoint } from "@/components/ProgressChart";
import {
  listPatients,
  listSessions,
  getActivePatientId,
  setActivePatientId,
  deleteSession,
} from "@/lib/api";
import { focusForSession } from "@/lib/focusFromExercises";

function buildFormQualityData(sessions: SessionRecord[]): ChartDataPoint[] {
  return sessions.map((s) => ({
    session_number: s.session_number,
    date: s.date ?? "",
    metric: "form_quality",
    value: s.avg_form_quality,
  }));
}

function buildPainData(sessions: SessionRecord[], type: "pre" | "post"): ChartDataPoint[] {
  return sessions.map((s) => ({
    session_number: s.session_number,
    date: s.date ?? "",
    metric: `pain_${type}`,
    value: type === "pre" ? s.pain_pre : s.pain_post,
  }));
}

function buildVolumeData(sessions: SessionRecord[]): ChartDataPoint[] {
  return sessions.map((s) => ({
    session_number: s.session_number,
    date: s.date ?? "",
    metric: "total_reps",
    value: s.total_reps,
  }));
}

export default function ProgressPage() {
  const [profiles, setProfiles] = useState<PatientRecord[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PatientRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // Active focus filter. `null` means "All" — show every session. Any other
  // value narrows charts + totals + the list to sessions tagged with that
  // focus via `summary.focus`.
  const [activeFocus, setActiveFocus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  async function handleDelete(id: string, e: React.MouseEvent) {
    // Stop the click from navigating to the session's report.
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;
    if (!window.confirm("Delete this session? This cannot be undone.")) return;

    setDeletingId(id);
    const prev = sessions;
    setSessions((s) => s.filter((x) => x.id !== id));
    try {
      await deleteSession(id);
    } catch {
      setSessions(prev);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await listPatients();
        if (cancelled) return;
        setProfiles(all);

        const activeId = getActivePatientId();
        const active = all.find((p) => p.id === activeId) ?? all[0] ?? null;
        setSelectedProfile(active);

        if (active) {
          const s = await listSessions(active.id);
          if (!cancelled) setSessions(s);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleProfileChange(id: string) {
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;
    setSelectedProfile(profile);
    setActivePatientId(profile.id);
    const s = await listSessions(profile.id);
    setSessions(s);
  }

  // All focus tags present in this patient's history, in insertion order.
  // Drives the filter pill row and the program label header. Resolves
  // via focusForSession so historical sessions missing summary.focus fall
  // back to their exercise-derived region.
  const focuses = Array.from(
    new Set(
      sessions
        .map((s) => focusForSession(s))
        .filter((f): f is string => typeof f === "string" && f.length > 0),
    ),
  );

  const filteredSessions = activeFocus
    ? sessions.filter((s) => focusForSession(s) === activeFocus)
    : sessions;

  const hasSessions = filteredSessions.length > 0;
  const totalSessions = filteredSessions.length;
  const avgQuality = hasSessions
    ? Math.round(
        filteredSessions.reduce((sum, s) => sum + s.avg_form_quality, 0) /
          totalSessions,
      )
    : 0;
  const totalMinutes = filteredSessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0,
  );

  const primaryRegion =
    selectedProfile?.profile?.diagnostic?.body_region ?? "general";
  const programLabel = activeFocus
    ? `${activeFocus} program`
    : focuses.length > 1
      ? `${focuses.join(" · ")} program`
      : `${primaryRegion} program`;

  const focusColor = (focus: string): string => {
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
        return "var(--color-text-muted)";
    }
  };

  return (
    <main className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: "var(--color-text-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Home
        </Link>

        {profiles.length > 1 && (
          <select
            value={selectedProfile?.id ?? ""}
            onChange={(e) => handleProfileChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </header>

      {/* Profile Header */}
      {selectedProfile && (
        <div className="animate-fade-in">
          <h1 className="text-3xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {selectedProfile.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {programLabel} · {totalSessions} session{totalSessions !== 1 ? "s" : ""}
          </p>

          {focuses.length > 1 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFocus(null)}
                className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors"
                style={{
                  background: activeFocus === null
                    ? "var(--color-accent-dim)"
                    : "var(--color-surface-raised)",
                  border: `1px solid ${activeFocus === null ? "var(--color-accent)" : "var(--color-border)"}`,
                  color: activeFocus === null ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                All
              </button>
              {focuses.map((f) => {
                const active = activeFocus === f;
                const color = focusColor(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActiveFocus(f)}
                    className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors"
                    style={{
                      background: active ? `${color}22` : "var(--color-surface-raised)",
                      border: `1px solid ${active ? color : "var(--color-border)"}`,
                      color: active ? color : "var(--color-text-secondary)",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="spinner" />
        </div>
      ) : !hasSessions ? (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="text-center max-w-lg px-6">
            <div className="w-14 h-14 rounded-2xl glass-card mx-auto mb-6 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3v18h18"/>
                <path d="M7 16l4-8 4 4 4-6"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
              No sessions yet
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
              Complete your first exercise session to start tracking progress.
            </p>
            <Link href="/session" className="btn-accent">
              Start Session
            </Link>
          </div>
        </div>
      ) : (
        /* Data Dashboard */
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Overview Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-semibold font-mono" style={{ color: "var(--color-accent)" }}>
                {totalSessions}
              </div>
              <div className="data-label mt-1">Sessions</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-semibold font-mono" style={{ color: avgQuality >= 80 ? "var(--color-success)" : avgQuality >= 60 ? "#eab308" : "#ef4444" }}>
                {avgQuality}%
              </div>
              <div className="data-label mt-1">Avg Form</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-semibold font-mono" style={{ color: "var(--color-text-primary)" }}>
                {filteredSessions.reduce((sum, s) => sum + s.total_reps, 0)}
              </div>
              <div className="data-label mt-1">Total Reps</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-semibold font-mono" style={{ color: "var(--color-text-primary)" }}>
                {totalMinutes}m
              </div>
              <div className="data-label mt-1">Total Time</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <ProgressChart
              data={buildFormQualityData(filteredSessions)}
              title="Form Quality (%)"
              yLabel="Quality %"
              color="#22c55e"
            />
            <ProgressChart
              data={buildVolumeData(filteredSessions)}
              title="Volume (Total Reps)"
              yLabel="Reps"
              color="#3b82f6"
            />
            <ProgressChart
              data={buildPainData(filteredSessions, "pre")}
              title="Pain Before Session"
              yLabel="Pain (0-10)"
              color="#ef4444"
            />
            <ProgressChart
              data={buildPainData(filteredSessions, "post")}
              title="Pain After Session"
              yLabel="Pain (0-10)"
              color="#f97316"
            />
          </div>

          {/* Session History */}
          <div>
            <h3 className="text-sm uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>
              Session History
            </h3>
            <div className="flex flex-col gap-2">
              {(() => {
                const ordered = [...filteredSessions].reverse();
                const visible = showAllSessions ? ordered : ordered.slice(0, 5);
                return visible;
              })().map((s) => {
                const focus = focusForSession(s);
                const isDeleting = deletingId === s.id;
                return (
                <Link
                  key={s.id}
                  href={`/report/${s.id}`}
                  className="group glass-card p-4 flex items-center justify-between hover:border-[var(--color-border-bright)] transition-colors cursor-pointer"
                  style={{ opacity: isDeleting ? 0.4 : 1, pointerEvents: isDeleting ? "none" : undefined }}
                >
                  <div className="flex items-center gap-3">
                    {focus && (
                      <span
                        className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full shrink-0"
                        style={{
                          background: "var(--color-surface-raised)",
                          border: `1px solid ${focusColor(focus)}40`,
                          color: focusColor(focus),
                        }}
                      >
                        {focus}
                      </span>
                    )}
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        Session {s.session_number}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {s.date ? new Date(s.date).toLocaleDateString() : ""} · {s.duration_minutes}min · {s.exercises.length} exercises
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-mono" style={{
                        color: s.avg_form_quality >= 80 ? "var(--color-success)" : s.avg_form_quality >= 60 ? "#eab308" : "#ef4444"
                      }}>
                        {s.avg_form_quality}%
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>form</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono" style={{
                        color: s.pain_pre > s.pain_post ? "var(--color-success)" : "var(--color-text-primary)"
                      }}>
                        {s.pain_pre > s.pain_post ? `-${s.pain_pre - s.pain_post}` : s.pain_pre === s.pain_post ? "0" : `+${s.pain_post - s.pain_pre}`}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>pain</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(s.id, e)}
                      disabled={isDeleting}
                      aria-label={`Delete session ${s.session_number}`}
                      title="Delete session"
                      className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                        color: "#ef4444",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                    <span className="text-[var(--color-text-muted)] text-lg" aria-hidden>
                      &rsaquo;
                    </span>
                  </div>
                </Link>
                );
              })}
            </div>
            {filteredSessions.length > 5 && (
              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={() => setShowAllSessions((v) => !v)}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {showAllSessions
                    ? "Show recent 5"
                    : `Show all ${filteredSessions.length} sessions`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
