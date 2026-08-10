import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { rateLimit } from "@/lib/api/rate-limit";
import { assertBillingActive } from "@/lib/billing/store";
import { receiveHeartbeat } from "@/lib/mt5/store";
import { resolveUidFromIngestSecret } from "@/lib/users/store";

export async function POST(req: Request) {
  return withApiError(async () => {
    await assertBillingActive();
    const secret = req.headers.get("x-mt5-secret");
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(`mt5-heartbeat:${ip}`)) return jsonError("rate limit", 429);
    const uid = await resolveUidFromIngestSecret(secret);
    if (!uid) return jsonError("unauthorized", 401);
    const data = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    await receiveHeartbeat(uid, data);
    return NextResponse.json({ ok: true });
  });
}
