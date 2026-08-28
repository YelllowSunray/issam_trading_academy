import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { groqConfigured } from "@/lib/ai/groq";
import { chatWithJournal } from "@/lib/ai/generate";
import { listChat } from "@/lib/ai/store";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";

export const maxDuration = 30;

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    return NextResponse.json({ messages: await listChat(uid, 20) });
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    if (!groqConfigured()) return jsonError("Groq is niet geconfigureerd", 500);
    const uid = await resolveTargetUid(req, user);
    if (uid !== user.uid) return jsonError("forbidden", 403);
    const body = (await req.json()) as { question?: string };
    const msg = await chatWithJournal(uid, body.question || "");
    return NextResponse.json(msg);
  });
}
