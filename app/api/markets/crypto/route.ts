import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { COINGECKO_IDS } from "@/lib/markets/instruments";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", COINGECKO_IDS.join(","));
    url.searchParams.set("order", "market_cap_desc");
    url.searchParams.set("sparkline", "false");
    url.searchParams.set("price_change_percentage", "24h");
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ coins: [], error: "CoinGecko tijdelijk onbereikbaar" });
    }
    const coins = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
      market_cap: number;
      price_change_percentage_24h: number;
    }>;
    return NextResponse.json({ coins });
  });
}
