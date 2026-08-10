import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { listAccounts } from "@/lib/mt5/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const accounts = await listAccounts(uid);
    return NextResponse.json(accounts);
  });
}
