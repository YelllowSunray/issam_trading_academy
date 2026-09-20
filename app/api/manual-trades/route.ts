import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { createManualTrade, listManualTrades } from "@/lib/journal/store";
import type { ManualTrade } from "@/lib/journal/types";
import { tRequest } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const trades = await listManualTrades(uid);
    return NextResponse.json(trades);
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    // writes always to self (coach view is read-only)
    const body = (await req.json()) as Omit<ManualTrade, "id" | "createdAt">;
    if (!body?.date || !body?.instrument || !body?.direction) {
      return jsonError(await tRequest("api.invalidTrade"));
    }
    if (body.entry == null || body.sl == null || body.exit == null) {
      return jsonError(await tRequest("api.entrySlExitRequired"));
    }
    const trade = await createManualTrade(user.uid, body);
    return NextResponse.json(trade);
  });
}
