import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const user = new URL(req.url).searchParams.get("wallet")?.trim() || "";
    if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
      return jsonError("Ongeldig wallet-adres");
    }
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Hyperliquid onbereikbaar" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ wallet: user, state: data });
  });
}
