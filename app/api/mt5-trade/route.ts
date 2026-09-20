import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { rateLimit } from "@/lib/api/rate-limit";
import { assertBillingActive } from "@/lib/billing/store";
import { receiveTrade } from "@/lib/mt5/store";
import type { Mt5Trade } from "@/lib/journal/types";
import { resolveUidFromIngestSecret } from "@/lib/users/store";
import { tRequest } from "@/lib/i18n/server";

export async function POST(req: Request) {
  return withApiError(async () => {
    await assertBillingActive();
    const secret = req.headers.get("x-mt5-secret");
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(`mt5-trade:${ip}`)) return jsonError("rate limit", 429);
    const uid = await resolveUidFromIngestSecret(secret);
    if (!uid) return jsonError("unauthorized", 401);
    const data = (await req.json()) as Mt5Trade;
    if (!data?.id) return jsonError(await tRequest("api.invalidPayload"), 400);
    await receiveTrade(uid, data);
    return NextResponse.json({ ok: true });
  });
}
