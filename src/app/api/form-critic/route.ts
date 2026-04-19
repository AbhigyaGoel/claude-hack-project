import { NextRequest } from "next/server";
import { analyzeRep } from "@/agents/formCritic";
import { getDb } from "@/db";
import { repAnalyses } from "@/db/schema";

export type { Fault, Compensation, RepAnalysis } from "@/agents/formCritic";

function generateId(): string {
  return `ra_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exercise, rep_data, keypoints_timeseries, frame_base64, set_id } = body;

    if (!exercise || !rep_data) {
      return Response.json(
        { error: "Missing required fields: exercise, rep_data" },
        { status: 400 },
      );
    }

    const analysis = await analyzeRep({
      exercise,
      rep_data,
      keypoints_timeseries,
      frame_base64,
    });

    if (set_id) {
      const db = getDb();
      await db.insert(repAnalyses).values({
        id: generateId(),
        set_id,
        rep_num: rep_data.rep_number ?? 1,
        video_clip_url: null,
        faults_json: JSON.stringify(analysis.faults),
        quality: analysis.quality,
      });
    }

    return Response.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Form analysis failed", detail: message },
      { status: 500 },
    );
  }
}
