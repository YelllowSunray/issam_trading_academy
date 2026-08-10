import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { getSettings, updateSettings } from "@/lib/journal/store";
import type { AppSettings } from "@/lib/journal/types";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const settings = await getSettings(uid);
    return NextResponse.json(settings);
  });
}

export async function PUT(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const body = (await req.json()) as Partial<AppSettings>;
    const settings = await updateSettings(user.uid, body);
    return NextResponse.json(settings);
  });
}
