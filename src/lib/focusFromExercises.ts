import exercises from "@/data/exercises.json";
import type { SessionRecord } from "@/types/storage";

interface LibraryEntry {
  id: string;
  body_region?: string;
}

const LIBRARY = exercises as LibraryEntry[];
const REGION_BY_ID: Record<string, string> = {};
for (const ex of LIBRARY) {
  if (ex.body_region) REGION_BY_ID[ex.id] = ex.body_region;
}

/**
 * Read-time focus resolver for any session. Prefers the persisted
 * `summary.focus` if it's present (that's what new sessions write at save
 * time); otherwise derives one from the session's recorded exercises so
 * historical sessions — saved before focus-tagging shipped — still
 * surface in the home picker and the progress filter.
 */
export function focusForSession(session: SessionRecord): string | null {
  const stored = (session.summary as { focus?: string } | null)?.focus;
  if (typeof stored === "string" && stored.length > 0) return stored;
  return deriveFocusFromExercises(session.exercises.map((e) => e.exercise_id));
}

/**
 * Pick the focus label for a workout from the body regions of its
 * exercises. A single region dominates → that's the focus. Multiple
 * regions with no clear plurality → "integrated" so the progress filter
 * still picks up the session (otherwise it would be unfilterable).
 */
export function deriveFocusFromExercises(exerciseIds: string[]): string | null {
  if (exerciseIds.length === 0) return null;

  const counts = new Map<string, number>();
  for (const id of exerciseIds) {
    const region = REGION_BY_ID[id];
    if (!region) continue;
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  if (counts.size === 1) return counts.keys().next().value ?? null;

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const [topRegion, topCount] = sorted[0];
  const [, secondCount] = sorted[1];
  return topCount > secondCount ? topRegion : "integrated";
}
