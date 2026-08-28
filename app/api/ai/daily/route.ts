import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { groqConfigured } from "@/lib/ai/groq";
import { ensureDailyBrief } from "@/lib/ai/generate";
import { getDailyBrief } from "@/lib/ai/store";
import { todayAmsterdam } from "@/lib/ai/stats";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";

export const maxDuration = 30;

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const cached = await getDailyBrief(uid, todayAmsterdam());
    if (cached) return NextResponse.json(cached);
    if (!groqConfigured()) return jsonError("Groq is niet geconfigureerd", 500);
    const brief = await ensureDailyBrief(uid, false);
    return NextResponse.json(brief);
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    if (!groqConfigured()) return jsonError("Groq is niet geconfigureerd", 500);
    const uid = await resolveTargetUid(req, user);
    if (uid !== user.uid) return jsonError("forbidden", 403);
    const brief = await ensureDailyBrief(uid, true);
    return NextResponse.json(brief);
  });
}
