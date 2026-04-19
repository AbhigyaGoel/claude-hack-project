"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProgressChart from "@/components/ProgressChart";
import type { StoredProfile, StoredSession } from "@/types/storage";
import type { ChartDataPoint } from "@/agents/progressAnalyst";
import { getProfiles, getActiveProfile, getSessionsForProfile, setActiveProfileId } from "@/lib/storage";

function buildFormQualityData(sessions: StoredSession[]): ChartDataPoint[] {
  return sessions.map((s) => ({
    session_number: s.session_number,
    date: s.date,
    metric: "form_quality",
    value: s.avg_form_quality,
  }));
}

function buildPainData(sessions: StoredSession[], type: "pre" | "post"): ChartDataPoint[] {
  return sessions.map((s) => ({
    session_number: s.session_number,
    date: s.date,
    metric: `pain_${type}`,
    value: type === "pre" ? s.pain_pre : s.pain_post,
  }));
}

function buildVolumeData(sessions: StoredSession[]): ChartDataPoint[] {
  return sessions.map((s) => ({
    session_number: s.session_number,
    date: s.date,
    metric: "total_reps",
    value: s.total_reps,
  }));
}

function buildRomData(sessions: StoredSession[]): ChartDataPoint[] {
  return sessions.map((s) => {
    const exercises = s.exercises;
    if (exercises.length === 0) return { session_number: s.session_number, date: s.date, metric: "rom", value: 0 };

    const romPcts = exercises.map((ex) => {
      const peakKeys = Object.keys(ex.peak_angles);
      if (peakKeys.length === 0) return 0;
      const avgPeak = peakKeys.reduce((sum, k) => sum + (ex.peak_angles[k] ?? 0), 0) / peakKeys.length;
      const avgTarget = peakKeys.reduce((sum, k) => sum + (ex.target_angles[k] ?? 1), 0) / peakKeys.length;
      return avgTarget > 0 ? Math.round((avgPeak / avgTarget) * 100) : 0;
    });

    return {
      session_number: s.session_number,
      date: s.date,
      metric: "rom",
      value: Math.round(romPcts.reduce((a, b) => a + b, 0) / romPcts.length),
    };
  });
}

export default function ProgressPage() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<StoredProfile | null>(null);
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  useEffect(() => {
    const allProfiles = getProfiles();
    setProfiles(allProfiles);

    const active = getActiveProfile();
    if (active) {
      setSelectedProfile(active);
      setSessions(getSessionsForProfile(active.id));
    } else if (allProfiles.length > 0) {
      setSelectedProfile(allProfiles[0]);
      setSessions(getSessionsForProfile(allProfiles[0].id));
    }
  }, []);

  function handleProfileChange(id: string) {
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      setSelectedProfile(profile);
      setActiveProfileId(profile.id);
      setSessions(getSessionsForProfile(profile.id));
    }
  }

  const hasSessions = sessions.length > 0;
  const totalSessions = sessions.length;
  const avgQuality = hasSessions
    ? Math.round(sessions.reduce((sum, s) => sum + s.avg_form_quality, 0) / totalSessions)
    : 0;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);

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
            {selectedProfile.diagnostic.body_region} program · {totalSessions} session{totalSessions !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {!hasSessions ? (
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
                {sessions.reduce((sum, s) => sum + s.total_reps, 0)}
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
              data={buildFormQualityData(sessions)}
              title="Form Quality (%)"
              yLabel="Quality %"
              color="#22c55e"
            />
            <ProgressChart
              data={buildVolumeData(sessions)}
              title="Volume (Total Reps)"
              yLabel="Reps"
              color="#3b82f6"
            />
            <ProgressChart
              data={buildPainData(sessions, "pre")}
              title="Pain Before Session"
              yLabel="Pain (0-10)"
              color="#ef4444"
            />
            <ProgressChart
              data={buildPainData(sessions, "post")}
              title="Pain After Session"
              yLabel="Pain (0-10)"
              color="#f97316"
            />
            <ProgressChart
              data={buildRomData(sessions)}
              title="ROM Achievement (%)"
              yLabel="% of Target"
              color="#8b5cf6"
            />
          </div>

          {/* Session History */}
          <div>
            <h3 className="text-sm uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>
              Session History
            </h3>
            <div className="flex flex-col gap-2">
              {[...sessions].reverse().map((s) => (
                <div
                  key={s.id}
                  className="glass-card p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      Session {s.session_number}
                    </div>
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(s.date).toLocaleDateString()} · {s.duration_minutes}min · {s.exercises.length} exercises
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
