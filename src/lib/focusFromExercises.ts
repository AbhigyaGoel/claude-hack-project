import exercises from "@/data/exercises.json";

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
