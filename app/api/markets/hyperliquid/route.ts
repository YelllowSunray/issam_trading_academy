import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { tRequest } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const user = new URL(req.url).searchParams.get("wallet")?.trim() || "";
    if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
      return jsonError(await tRequest("api.invalidWallet"));
    }
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: await tRequest("api.hyperliquidUnreachable") }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ wallet: user, state: data });
  });
}
