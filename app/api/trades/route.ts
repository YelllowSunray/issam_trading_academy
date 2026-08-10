import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { listTrades } from "@/lib/mt5/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const { searchParams } = new URL(req.url);
    const login = searchParams.get("login");
    const trades = await listTrades(login);
    return NextResponse.json(trades);
  });
}
