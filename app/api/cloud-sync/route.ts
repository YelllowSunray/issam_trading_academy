import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { listCloudAccountsForUid } from "@/lib/api2trade/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const accounts = await listCloudAccountsForUid(user.uid);
    return NextResponse.json({
      accounts: accounts.map((a) => ({
        accountId: a.accountId,
        login: a.login,
        server: a.server,
        name: a.name,
        status: a.status,
        lastSyncAt: a.lastSyncAt,
        lastError: a.lastError,
      })),
    });
  });
}
