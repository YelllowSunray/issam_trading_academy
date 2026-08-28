import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { groqConfigured } from "@/lib/ai/groq";
import { coachBrief } from "@/lib/ai/generate";
import { requireAdmin } from "@/lib/auth/request";
import { getUserProfile } from "@/lib/users/store";

export const maxDuration = 30;

export async function POST(req: Request) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    if (!groqConfigured()) return jsonError("Groq is niet geconfigureerd", 500);
    const body = (await req.json()) as { uid?: string };
    if (!body.uid) return jsonError("uid verplicht");
    const profile = await getUserProfile(body.uid);
    if (!profile) return jsonError("user not found", 404);
    const bodyText = await coachBrief(
      profile.uid,
      profile.displayName || profile.email,
      admin.uid,
    );
    return NextResponse.json({ body: bodyText, name: profile.displayName });
  });
}
