import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { createManualTrade, listManualTrades } from "@/lib/journal/store";
import type { ManualTrade } from "@/lib/journal/types";

export async function GET() {
  return withApiError(async () => {
    const trades = await listManualTrades();
    return NextResponse.json(trades);
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const body = (await req.json()) as Omit<ManualTrade, "id" | "createdAt">;
    if (!body?.date || !body?.instrument || !body?.direction) {
      return jsonError("ongeldige trade");
    }
    if (body.entry == null || body.sl == null || body.exit == null) {
      return jsonError("entry, sl en exit zijn verplicht");
    }
    const trade = await createManualTrade(body);
    return NextResponse.json(trade);
  });
}
