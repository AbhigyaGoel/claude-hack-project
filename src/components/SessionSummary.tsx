"use client";

import type { FormAssessment } from "@/types/assessment";
import type { ExercisePlanItem } from "@/types/exercise";

interface ExerciseSummary {
  exercise: ExercisePlanItem;
  assessments: FormAssessment[];
  setsCompleted: number;
  repsPerSet: number[];
}

interface SessionSummaryProps {
  exerciseSummaries: ExerciseSummary[];
  painPre: number;
  painPost: number;
  durationMinutes: number;
  onClose: () => void;
}

function getQualityPercentage(assessments: FormAssessment[]): number {
  if (assessments.length === 0) return 0;
  const greenCount = assessments.filter((a) => a.rep_quality === "green").length;
  return Math.round((greenCount / assessments.length) * 100);
}

export default function SessionSummary({
  exerciseSummaries,
  painPre,
  painPost,
  durationMinutes,
  onClose,
}: SessionSummaryProps) {
  const totalReps = exerciseSummaries.reduce(
    (sum, es) => sum + es.repsPerSet.reduce((a, b) => a + b, 0),
    0,
  );

  const avgQuality = Math.round(
    exerciseSummaries.reduce((sum, es) => sum + getQualityPercentage(es.assessments), 0) /
      Math.max(exerciseSummaries.length, 1),
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6 flex flex-col gap-6 max-w-2xl mx-auto">
      <h2 className="text-white text-2xl font-bold text-center">Session Complete</h2>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-white">{durationMinutes}</div>
          <div className="text-gray-400 text-sm">Minutes</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-white">{totalReps}</div>
          <div className="text-gray-400 text-sm">Total Reps</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className={`text-3xl font-bold ${avgQuality >= 80 ? "text-green-400" : avgQuality >= 60 ? "text-yellow-400" : "text-red-400"}`}>
            {avgQuality}%
          </div>
          <div className="text-gray-400 text-sm">Form Quality</div>
        </div>
      </div>

      {/* Pain change */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Pain Before</span>
          <span className="text-white font-mono">{painPre}/10</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-gray-400">Pain After</span>
          <span className="text-white font-mono">{painPost}/10</span>
        </div>
        {painPost < painPre && (
          <p className="text-green-400 text-sm mt-2">
            Pain reduced by {painPre - painPost} points
          </p>
        )}
      </div>

      {/* Per-exercise breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="text-gray-400 text-sm uppercase tracking-wide">Exercise Breakdown</h3>
        {exerciseSummaries.map((es, i) => (
          <div key={i} className="bg-gray-700 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">{es.exercise.name}</span>
              <span className="text-gray-400 text-sm">
                {es.setsCompleted}/{es.exercise.sets} sets
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Reps: {es.repsPerSet.join("/")}</span>
              <span>Quality: {getQualityPercentage(es.assessments)}%</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Return Home
      </button>
    </div>
  );
}
