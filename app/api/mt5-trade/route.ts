import { NextResponse } from "next/server";
import { assertMt5Secret, jsonError, withApiError } from "@/lib/api/errors";
import { receiveTrade } from "@/lib/mt5/store";
import type { Mt5Trade } from "@/lib/journal/types";

export async function POST(req: Request) {
  return withApiError(async () => {
    assertMt5Secret(req);
    const data = (await req.json()) as Mt5Trade;
    if (!data?.id) return jsonError("ongeldige payload", 400);
    await receiveTrade(data);
    return NextResponse.json({ ok: true });
  });
}
