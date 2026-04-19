import type { StoredProfile, StoredSession } from "@/types/storage";

const KEYS = {
  profiles: "vero:profiles",
  sessions: "vero:sessions",
  activeProfile: "vero:activeProfile",
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Profiles ---

export function getProfiles(): StoredProfile[] {
  return readJson<StoredProfile[]>(KEYS.profiles, []);
}

export function saveProfile(profile: StoredProfile): StoredProfile {
  const profiles = getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  const updated = idx >= 0
    ? [...profiles.slice(0, idx), profile, ...profiles.slice(idx + 1)]
    : [...profiles, profile];
  writeJson(KEYS.profiles, updated);
  return profile;
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter((p) => p.id !== id);
  writeJson(KEYS.profiles, profiles);

  // Also remove associated sessions
  const sessions = getSessions().filter((s) => s.profile_id !== id);
  writeJson(KEYS.sessions, sessions);

  // Clear active if it was this profile
  if (getActiveProfileId() === id) {
    localStorage.removeItem(KEYS.activeProfile);
  }
}

export function getActiveProfileId(): string | null {
  return readJson<string | null>(KEYS.activeProfile, null);
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(KEYS.activeProfile, JSON.stringify(id));
}

export function getActiveProfile(): StoredProfile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return getProfiles().find((p) => p.id === id) ?? null;
}

// --- Sessions ---

export function getSessions(): StoredSession[] {
  return readJson<StoredSession[]>(KEYS.sessions, []);
}

export function getSessionsForProfile(profileId: string): StoredSession[] {
  return getSessions()
    .filter((s) => s.profile_id === profileId)
    .sort((a, b) => a.session_number - b.session_number);
}

export function saveSession(session: StoredSession): StoredSession {
  const sessions = [...getSessions(), session];
  writeJson(KEYS.sessions, sessions);

  // Increment profile session count
  const profiles = getProfiles();
  const profile = profiles.find((p) => p.id === session.profile_id);
  if (profile) {
    saveProfile({
      ...profile,
      session_count: profile.session_count + 1,
      updated_at: new Date().toISOString(),
    });
  }

  return session;
}

export function clearAllData(): void {
  localStorage.removeItem(KEYS.profiles);
  localStorage.removeItem(KEYS.sessions);
  localStorage.removeItem(KEYS.activeProfile);
}
