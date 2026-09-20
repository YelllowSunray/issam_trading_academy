export type DexWindow = "h1" | "h6" | "h24";

export type DexTrendingCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  chain: string;
  url: string;
  priceUsd: number | null;
  change1h: number | null;
  change6h: number | null;
  change24h: number | null;
  vol1h: number | null;
  vol6h: number | null;
  vol24h: number | null;
  liquidity: number | null;
  marketCap: number | null;
  featured?: boolean;
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  priceChange?: { h1?: number; h6?: number; h24?: number };
  volume?: { h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
  info?: { imageUrl?: string };
};

type BoostRow = {
  url?: string;
  chainId?: string;
  tokenAddress?: string;
  description?: string;
  icon?: string;
  header?: string;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function logoFor(pair: DexPair, fallback?: string | null) {
  if (pair.info?.imageUrl) return pair.info.imageUrl;
  if (fallback) return fallback;
  const chain = pair.chainId;
  const address = pair.baseToken?.address;
  if (chain && address) {
    return `https://dd.dexscreener.com/ds-data/tokens/${chain}/${address}.png`;
  }
  return "";
}

function toCoin(pair: DexPair, opts?: { featured?: boolean; image?: string }): DexTrendingCoin | null {
  const symbol = (pair.baseToken?.symbol || "").trim();
  if (!symbol) return null;
  const address = pair.baseToken?.address || pair.pairAddress || symbol;
  const chain = pair.chainId || "";
  return {
    id: `${chain}:${address}`.toLowerCase(),
    symbol: symbol.toUpperCase(),
    name: pair.baseToken?.name || symbol,
    image: logoFor(pair, opts?.image),
    chain,
    url: pair.url || "",
    priceUsd: num(pair.priceUsd),
    change1h: num(pair.priceChange?.h1),
    change6h: num(pair.priceChange?.h6),
    change24h: num(pair.priceChange?.h24),
    vol1h: num(pair.volume?.h1),
    vol6h: num(pair.volume?.h6),
    vol24h: num(pair.volume?.h24),
    liquidity: num(pair.liquidity?.usd),
    marketCap: num(pair.marketCap ?? pair.fdv),
    featured: opts?.featured,
  };
}

async function dexJson<T>(path: string, revalidate: number): Promise<T | null> {
  const res = await fetch(`https://api.dexscreener.com${path}`, {
    next: { revalidate },
    headers: {
      Accept: "application/json",
      "User-Agent": "Tradechain/1.0",
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function searchBest(q: string): Promise<DexPair | null> {
  const body = await dexJson<{ pairs?: DexPair[] }>(
    `/latest/dex/search?q=${encodeURIComponent(q)}`,
    45,
  );
  const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
  if (!pairs.length) return null;
  return [...pairs].sort(
    (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
  )[0];
}

async function hydrateChain(chainId: string, addresses: string[]) {
  const unique = [...new Set(addresses.filter(Boolean))].slice(0, 30);
  if (!unique.length) return [] as DexPair[];
  const body = await dexJson<DexPair[] | { pairs?: DexPair[] }>(
    `/tokens/v1/${encodeURIComponent(chainId)}/${unique.join(",")}`,
    45,
  );
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.pairs)) return body.pairs;
  return [];
}

export async function loadDexTrending(): Promise<DexTrendingCoin[]> {
  const [top, latest] = await Promise.all([
    dexJson<BoostRow[]>("/token-boosts/top/v1", 45),
    dexJson<BoostRow[]>("/token-boosts/latest/v1", 45),
  ]);
  const boosts = [...(Array.isArray(top) ? top : []), ...(Array.isArray(latest) ? latest : [])];
  const iconByToken = new Map<string, string>();
  const byChain = new Map<string, string[]>();
  for (const row of boosts) {
    if (!row.chainId || !row.tokenAddress) continue;
    const key = `${row.chainId}:${row.tokenAddress}`.toLowerCase();
    if (row.icon) iconByToken.set(key, row.icon);
    const list = byChain.get(row.chainId) || [];
    if (!list.includes(row.tokenAddress)) list.push(row.tokenAddress);
    byChain.set(row.chainId, list);
  }

  const pairLists = await Promise.all(
    [...byChain.entries()].slice(0, 8).map(([chain, addrs]) =>
      hydrateChain(chain, addrs.slice(0, 20)),
    ),
  );

  const bestByToken = new Map<string, DexPair>();
  for (const pairs of pairLists) {
    for (const pair of pairs) {
      const address = pair.baseToken?.address;
      const chain = pair.chainId;
      if (!address || !chain) continue;
      const key = `${chain}:${address}`.toLowerCase();
      const prev = bestByToken.get(key);
      if (!prev || (pair.liquidity?.usd || 0) > (prev.liquidity?.usd || 0)) {
        bestByToken.set(key, pair);
      }
    }
  }

  const majors = await Promise.all(
    ["BTC", "ETH", "SOL", "WETH", "WBTC"].map((q) => searchBest(q)),
  );

  const out = new Map<string, DexTrendingCoin>();
  for (const pair of majors) {
    if (!pair) continue;
    const coin = toCoin(pair, { featured: true });
    if (coin) out.set(coin.id, coin);
  }
  for (const [key, pair] of bestByToken) {
    const coin = toCoin(pair, { image: iconByToken.get(key) });
    if (!coin) continue;
    const existing = out.get(coin.id);
    if (!existing || (coin.liquidity || 0) > (existing.liquidity || 0)) {
      out.set(coin.id, { ...coin, featured: existing?.featured });
    }
  }

  return [...out.values()];
}

export function sortTrending(coins: DexTrendingCoin[], window: DexWindow) {
  const change = (c: DexTrendingCoin) =>
    window === "h1" ? c.change1h : window === "h6" ? c.change6h : c.change24h;
  const vol = (c: DexTrendingCoin) =>
    window === "h1" ? c.vol1h : window === "h6" ? c.vol6h : c.vol24h;
  return [...coins].sort((a, b) => {
    const av = Math.abs(change(a) ?? -Infinity);
    const bv = Math.abs(change(b) ?? -Infinity);
    if (av !== bv) return bv - av;
    return (vol(b) || 0) - (vol(a) || 0);
  });
}
