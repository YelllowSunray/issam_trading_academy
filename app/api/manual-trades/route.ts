import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { createManualTrade, listManualTrades } from "@/lib/journal/store";
import type { ManualTrade } from "@/lib/journal/types";

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
      return jsonError("ongeldige trade");
    }
    if (body.entry == null || body.sl == null || body.exit == null) {
      return jsonError("entry, sl en exit zijn verplicht");
    }
    const trade = await createManualTrade(user.uid, body);
    return NextResponse.json(trade);
  });
}
