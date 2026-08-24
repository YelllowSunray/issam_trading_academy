import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import { syncAllCloudAccounts, syncCloudAccount } from "@/lib/api2trade/sync";

export const maxDuration = 60;

export async function POST(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    const body = (await req.json().catch(() => ({}))) as { accountId?: string };
    if (body.accountId) {
      const result = await syncCloudAccount(body.accountId);
      return NextResponse.json({ ok: result.ok, results: [result] });
    }
    const results = await syncAllCloudAccounts();
    return NextResponse.json({
      ok: results.every((r) => r.ok),
      results,
    });
  });
}
