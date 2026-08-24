import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { api2tradeConfigured } from "@/lib/api2trade/client";
import { syncAllCloudAccounts } from "@/lib/api2trade/sync";

export const maxDuration = 60;
export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return Boolean(match && match[1] === secret);
}

export async function GET(req: Request) {
  return withApiError(async () => {
    if (!authorized(req)) return jsonError("unauthorized", 401);
    if (!api2tradeConfigured()) {
      return NextResponse.json({ ok: true, skipped: "not_configured" });
    }
    const results = await syncAllCloudAccounts();
    return NextResponse.json({
      ok: results.every((r) => r.ok),
      results,
    });
  });
}
