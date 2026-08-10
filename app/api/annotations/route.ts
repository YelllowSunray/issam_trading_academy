import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { listAnnotations } from "@/lib/journal/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const annotations = await listAnnotations(uid);
    return NextResponse.json(annotations);
  });
}
