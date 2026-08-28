import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { groqConfigured } from "@/lib/ai/groq";
import { debriefTrade } from "@/lib/ai/generate";
import { getDebrief } from "@/lib/ai/store";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";

export const maxDuration = 30;

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const tradeId = new URL(req.url).searchParams.get("tradeId") || "";
    if (!tradeId) return jsonError("tradeId verplicht");
    return NextResponse.json({ debrief: await getDebrief(uid, tradeId) });
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    if (!groqConfigured()) return jsonError("Groq is niet geconfigureerd", 500);
    const uid = await resolveTargetUid(req, user);
    if (uid !== user.uid) return jsonError("forbidden", 403);
    const body = (await req.json()) as { tradeId?: string };
    if (!body.tradeId) return jsonError("tradeId verplicht");
    const debrief = await debriefTrade(uid, body.tradeId);
    return NextResponse.json(debrief);
  });
}
