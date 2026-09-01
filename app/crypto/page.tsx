"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MemberPage } from "@/components/platform/MemberPage";
import {
  fetchCryptoMarkets,
  fetchDexTrending,
  fetchHyperliquid,
  searchDex,
} from "@/lib/journal/api-client";
import { sortTrending, type DexTrendingCoin, type DexWindow } from "@/lib/markets/dex-trending";

const WINDOWS: Array<{ id: DexWindow; label: string }> = [
  { id: "h1", label: "1H" },
  { id: "h6", label: "6H" },
  { id: "h24", label: "24H" },
];

function fmtUsd(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (Math.abs(value) >= 1) return `$${value.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
  return `$${value.toPrecision(4)}`;
}

function changeOf(coin: DexTrendingCoin, window: DexWindow) {
  return window === "h1" ? coin.change1h : window === "h6" ? coin.change6h : coin.change24h;
}

function volOf(coin: DexTrendingCoin, window: DexWindow) {
  return window === "h1" ? coin.vol1h : window === "h6" ? coin.vol6h : coin.vol24h;
}

function ChangeChip({ value }: { value: number | null }) {
  if (value == null) return <span className="dx-chip muted">—</span>;
  const up = value >= 0;
  return (
    <span className={`dx-chip ${up ? "up" : "down"}`}>
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function CoinLogo({ src, symbol }: { src?: string | null; symbol: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <span className="dx-logo dx-logo-fallback">{symbol.slice(0, 3)}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="dx-logo"
      src={src}
      alt=""
      width={32}
      height={32}
      onError={() => setBroken(true)}
    />
  );
}

function CryptoInner() {
  const [majors, setMajors] = useState<
    Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
      market_cap: number;
      price_change_percentage_24h: number;
    }>
  >([]);
  const [trending, setTrending] = useState<DexTrendingCoin[]>([]);
  const [window, setWindow] = useState<DexWindow>("h1");
  const [pairs, setPairs] = useState<Array<Record<string, unknown>>>([]);
  const [q, setQ] = useState("SOL");
  const [wallet, setWallet] = useState("");
  const [hl, setHl] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetchCryptoMarkets()
      .then((r) => {
        setMajors(r.coins || []);
        if (r.error) setError(r.error);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
    fetchDexTrending()
      .then((r) => {
        setTrending(r.coins || []);
        if (r.note) setNote(r.note);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "DexScreener mislukt"));
  }, []);

  const ranked = useMemo(() => sortTrending(trending, window).slice(0, 24), [trending, window]);

  async function onDex(e: FormEvent) {
    e.preventDefault();
    const res = await searchDex(q);
    setPairs(res.pairs || []);
  }

  async function onHl(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetchHyperliquid(wallet);
      setHl(res.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hyperliquid mislukt");
    }
  }

  const positions = Array.isArray(
    (hl?.assetPositions as unknown) ||
      (hl as { assetPositions?: unknown[] } | null)?.assetPositions,
  )
    ? ((hl as { assetPositions: Array<{ position?: Record<string, unknown> }> }).assetPositions)
    : [];

  return (
    <div className="journal-main dx-page">
      <div className="dx-head">
        <div>
          <p className="tj-eyebrow">CRYPTO · LIVE FEED</p>
          <h1 className="tj-title">DexScreener</h1>
          <p className="pl-sub">
            Educatie + marktdata. Geen orders vanuit het platform. Geen
            custodial wallet — later eigen wallet koppelen (WalletConnect of
            Privy).
          </p>
          <div className="plat-chip-row" style={{ marginTop: 10 }}>
            <Link href="/markets" className="pl-reset-btn">
              Markets
            </Link>
            <Link href="/news" className="pl-reset-btn">
              Nieuws
            </Link>
          </div>
        </div>
        <div className="dx-windows">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`dx-win${window === w.id ? " active" : ""}`}
              onClick={() => setWindow(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      {note && <p className="dx-note">{note}</p>}
      {error && <div className="pl-empty">{error}</div>}

      <section className="dx-majors">
        {majors.map((c) => (
          <article key={c.id} className="dx-major">
            <CoinLogo src={c.image} symbol={c.symbol.toUpperCase()} />
            <div>
              <div className="dx-sym">{c.symbol.toUpperCase()}</div>
              <div className="dx-name">{c.name}</div>
            </div>
            <div className="dx-major-right">
              <div className="dx-px">{fmtUsd(c.current_price)}</div>
              <ChangeChip value={c.price_change_percentage_24h} />
            </div>
          </article>
        ))}
      </section>

      <section className="tj-panel dx-panel">
        <div className="dx-panel-head">
          <div className="ttl">Trending · {WINDOWS.find((w) => w.id === window)?.label}</div>
          <span className="dx-count">{ranked.length} pairs</span>
        </div>
        <div className="dx-grid">
          {ranked.map((c, i) => (
            <a
              key={c.id}
              className={`dx-card${c.featured ? " featured" : ""}`}
              href={c.url || `https://dexscreener.com/${c.chain}`}
              target="_blank"
              rel="noreferrer"
            >
              <div className="dx-rank">{String(i + 1).padStart(2, "0")}</div>
              <CoinLogo src={c.image} symbol={c.symbol} />
              <div className="dx-card-meta">
                <div className="dx-sym">
                  {c.symbol}
                  {c.featured ? <span className="dx-tag">MAJ</span> : null}
                </div>
                <div className="dx-name">
                  {c.chain || "multi"} · {c.name}
                </div>
              </div>
              <div className="dx-card-stats">
                <div className="dx-px">{fmtUsd(c.priceUsd)}</div>
                <ChangeChip value={changeOf(c, window)} />
                <div className="dx-vol">vol {fmtUsd(volOf(c, window), 0)}</div>
              </div>
            </a>
          ))}
        </div>
        {!ranked.length && <div className="tj-empty">Nog geen trending data.</div>}
      </section>

      <section className="tj-panel dx-panel">
        <div className="ttl">Pair search</div>
        <form onSubmit={(e) => void onDex(e)} className="plat-inline-form">
          <input
            className="tj-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="BTC, ETH, SOL, PEPE…"
          />
          <button className="tb-addbtn" type="submit">
            Scan
          </button>
        </form>
        <div className="admin-table-wrap" style={{ marginTop: 12 }}>
          <table className="admin-table dx-table">
            <thead>
              <tr>
                <th>Pair</th>
                <th>Prijs</th>
                <th>Liq.</th>
                <th>24u vol</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p, i) => {
                const base = p.baseToken as { symbol?: string } | undefined;
                const quote = p.quoteToken as { symbol?: string } | undefined;
                const liq = p.liquidity as { usd?: number } | undefined;
                const vol = p.volume as { h24?: number } | undefined;
                return (
                  <tr key={String(p.pairAddress || i)}>
                    <td className="dx-sym">
                      {base?.symbol}/{quote?.symbol}
                    </td>
                    <td>{String(p.priceUsd || "—")}</td>
                    <td>
                      {liq?.usd != null ? fmtUsd(liq.usd, 0) : "—"}
                    </td>
                    <td>
                      {vol?.h24 != null ? fmtUsd(vol.h24, 0) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tj-panel dx-panel">
        <div className="ttl">Hyperliquid · adres-lookup</div>
        <p className="pl-sub2" style={{ margin: "6px 0 10px" }}>
          Plak een adres. Sleutels blijven bij jou — we bouwen geen eigen
          key-management.
        </p>
        <form onSubmit={(e) => void onHl(e)} className="plat-inline-form">
          <input
            className="tj-input"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x…"
          />
          <button className="tb-addbtn" type="submit">
            Positions
          </button>
        </form>
        {hl && (
          <div className="admin-table-wrap" style={{ marginTop: 12 }}>
            <table className="admin-table dx-table">
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Size</th>
                  <th>Entry</th>
                  <th>PnL</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((row, i) => {
                  const pos = row.position || {};
                  return (
                    <tr key={i}>
                      <td className="dx-sym">{String(pos.coin || "—")}</td>
                      <td>{String(pos.szi || "—")}</td>
                      <td>{String(pos.entryPx || "—")}</td>
                      <td>{String(pos.unrealizedPnl || "—")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!positions.length && (
              <div className="tj-empty">Geen open posities op dit adres.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CryptoPage() {
  return (
    <MemberPage>
      <CryptoInner />
    </MemberPage>
  );
}
