import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";

const COINS = [
  { id: "pax-gold", symbol: "XAU/USD", badge: "Au" },
  { id: "bitcoin", symbol: "BTC/USD", badge: "₿" },
  { id: "ethereum", symbol: "ETH/USD", badge: "Ξ" },
  { id: "solana", symbol: "SOL/USD", badge: "S" },
] as const;

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", COINS.map((c) => c.id).join(","));
    url.searchParams.set("sparkline", "false");
    url.searchParams.set("price_change_percentage", "24h");
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ tickers: [], error: "Prijzen tijdelijk onbereikbaar" });
    }
    const rows = (await res.json()) as Array<{
      id: string;
      current_price: number;
      price_change_percentage_24h: number;
    }>;
    const byId = new Map(rows.map((r) => [r.id, r]));
    const tickers = COINS.map((c) => {
      const row = byId.get(c.id);
      return {
        id: c.id,
        symbol: c.symbol,
        badge: c.badge,
        price: row?.current_price ?? null,
        change24h: row?.price_change_percentage_24h ?? null,
      };
    });
    return NextResponse.json({ tickers });
  });
}
