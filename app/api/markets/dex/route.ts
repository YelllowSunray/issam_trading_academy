import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";

async function searchPairs(q: string) {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
    { next: { revalidate: 30 }, headers: { Accept: "application/json" } },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as { pairs?: unknown[] };
  return Array.isArray(body.pairs) ? body.pairs : [];
}

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const q = new URL(req.url).searchParams.get("q")?.trim() || "SOL";
    if (q.length < 2) return jsonError("zoekterm te kort");

    let pairs = await searchPairs(q);
    if (!pairs.length && q.toUpperCase() === "BTC") {
      pairs = await searchPairs("WBTC");
    }
    if (!pairs.length) {
      const boosts = await fetch(
        "https://api.dexscreener.com/token-boosts/top/v1",
        { next: { revalidate: 60 }, headers: { Accept: "application/json" } },
      );
      if (boosts.ok) {
        const rows = (await boosts.json()) as Array<{
          url?: string;
          chainId?: string;
          tokenAddress?: string;
          description?: string;
        }>;
        pairs = rows.slice(0, 12).map((row) => ({
          pairAddress: row.tokenAddress,
          url: row.url,
          chainId: row.chainId,
          baseToken: { symbol: row.tokenAddress?.slice(0, 6) || "token" },
          quoteToken: { symbol: row.chainId || "" },
          priceUsd: "—",
          liquidity: {},
          volume: {},
          info: row.description,
        }));
      }
    }

    return NextResponse.json({ pairs: pairs.slice(0, 12) });
  });
}
