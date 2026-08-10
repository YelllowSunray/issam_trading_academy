import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { getStatus } from "@/lib/mt5/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const { searchParams } = new URL(req.url);
    const login = searchParams.get("login");
    const status = await getStatus(uid, login);
    return NextResponse.json(status);
  });
}
