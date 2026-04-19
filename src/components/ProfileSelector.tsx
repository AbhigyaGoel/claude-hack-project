"use client";

import { useEffect, useState } from "react";
import type { PatientRecord } from "@/types/storage";
import {
  listPatients,
  createPatient,
  deletePatient,
  setActivePatientId,
} from "@/lib/api";

interface ProfileSelectorProps {
  onSelect: (profile: PatientRecord) => void;
  onCreateNew: () => void;
}

export default function ProfileSelector({ onSelect, onCreateNew }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<PatientRecord[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listPatients()
      .then((rows) => {
        if (!cancelled) setProfiles(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    await deletePatient(id);
    setProfiles(await listPatients());
  }

  function handleSelect(profile: PatientRecord) {
    setActivePatientId(profile.id);
    onSelect(profile);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    const created = await createPatient(name.trim(), null);
    setProfiles(await listPatients());
    setActivePatientId(created.id);
    setShowNameInput(false);
    setName("");
    onCreateNew();
  }

  if (loading) {
    return (
      <div className="glass-card p-8 max-w-md mx-auto text-center">
        <div className="spinner mx-auto" />
      </div>
    );
  }

  if (profiles.length === 0 && !showNameInput) {
    return (
      <div className="glass-card p-8 max-w-md mx-auto text-center animate-fade-in">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
          Welcome to Vero
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Create a profile to start tracking your rehab progress across sessions.
        </p>
        <button onClick={() => setShowNameInput(true)} className="btn-accent">
          Create Profile
        </button>
        <button onClick={onCreateNew} className="btn-ghost text-sm mt-3 block mx-auto">
          Skip — start without a profile
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 max-w-md mx-auto animate-fade-in">
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Select Profile
      </h2>

      <div className="flex flex-col gap-2 mb-4">
        {profiles.map((p) => {
          const region = p.profile?.diagnostic?.body_region ?? "general";
          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
              onClick={() => handleSelect(p)}
            >
              <div>
                <div className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                  {p.name}
                </div>
                <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {region} · {p.session_count} session{p.session_count !== 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                className="text-xs p-1 rounded hover:bg-red-500/20 transition-colors"
                style={{ color: "var(--color-text-muted)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {showNameInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                handleCreate();
              }
            }}
          />
          <button onClick={handleCreate} className="btn-accent text-sm px-4">
            Go
          </button>
        </div>
      ) : (
        <button onClick={() => setShowNameInput(true)} className="btn-ghost text-sm w-full">
          + New Profile
        </button>
      )}
    </div>
  );
}
