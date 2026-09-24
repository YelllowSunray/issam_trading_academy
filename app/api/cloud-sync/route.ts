import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { listCloudAccountsForUid } from "@/lib/api2trade/store";
import { syncCloudAccount } from "@/lib/api2trade/sync";

export const maxDuration = 60;

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const accounts = await listCloudAccountsForUid(uid);
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

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    if (!rateLimit(`cloud-sync:${uid}`, 2, 30_000)) {
      return NextResponse.json({ ok: true, skipped: "rate" as const, results: [] });
    }
    const accounts = await listCloudAccountsForUid(uid);
    if (!accounts.length) {
      return NextResponse.json({ ok: true, results: [] });
    }
    const results = [];
    for (const account of accounts) {
      results.push(await syncCloudAccount(account.accountId));
    }
    return NextResponse.json({
      ok: results.every((r) => r.ok),
      results,
    });
  });
}
