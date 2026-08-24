"use client";

import { FormEvent, useEffect, useState } from "react";
import { MemberPage } from "@/components/platform/MemberPage";
import {
  fetchCryptoMarkets,
  fetchHyperliquid,
  searchDex,
} from "@/lib/journal/api-client";

function CryptoInner() {
  const [coins, setCoins] = useState<
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
  const [pairs, setPairs] = useState<Array<Record<string, unknown>>>([]);
  const [q, setQ] = useState("BTC");
  const [wallet, setWallet] = useState("");
  const [hl, setHl] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCryptoMarkets()
      .then((r) => {
        setCoins(r.coins || []);
        if (r.error) setError(r.error);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
    searchDex("BTC")
      .then((r) => setPairs(r.pairs || []))
      .catch(() => {});
  }, []);

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
    <div className="journal-main">
      <p className="tj-eyebrow">CRYPTO</p>
      <h1 className="tj-title">Overzicht</h1>
      <p className="pl-sub">
        Informatief — geen journal en geen trading vanuit het platform.
        CoinGecko prijzen, DexScreener pairs, Hyperliquid read-only.
      </p>
      {error && <div className="pl-empty">{error}</div>}

      <section className="tj-panel">
        <div className="ttl">Market caps</div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Coin</th>
                <th>Prijs</th>
                <th>24u</th>
                <th>Market cap</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.name} <span className="pl-sub2">{c.symbol.toUpperCase()}</span>
                  </td>
                  <td>${c.current_price?.toLocaleString("en-US")}</td>
                  <td
                    style={{
                      color:
                        (c.price_change_percentage_24h || 0) >= 0
                          ? "var(--bull)"
                          : "var(--bear)",
                    }}
                  >
                    {(c.price_change_percentage_24h || 0).toFixed(2)}%
                  </td>
                  <td>${Math.round(c.market_cap / 1e6).toLocaleString("en-US")}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tj-panel">
        <div className="ttl">DexScreener</div>
        <form onSubmit={(e) => void onDex(e)} className="plat-inline-form">
          <input
            className="tj-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="BTC, PEPE, pair…"
          />
          <button className="tb-addbtn" type="submit">
            Zoek
          </button>
        </form>
        <div className="admin-table-wrap" style={{ marginTop: 12 }}>
          <table className="admin-table">
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
                    <td>
                      {base?.symbol}/{quote?.symbol}
                    </td>
                    <td>{String(p.priceUsd || "—")}</td>
                    <td>
                      {liq?.usd != null ? `$${Math.round(liq.usd).toLocaleString("en-US")}` : "—"}
                    </td>
                    <td>
                      {vol?.h24 != null ? `$${Math.round(vol.h24).toLocaleString("en-US")}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tj-panel">
        <div className="ttl">Hyperliquid (read-only)</div>
        <form onSubmit={(e) => void onHl(e)} className="plat-inline-form">
          <input
            className="tj-input"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x…"
          />
          <button className="tb-addbtn" type="submit">
            Haal posities op
          </button>
        </form>
        {hl && (
          <div className="admin-table-wrap" style={{ marginTop: 12 }}>
            <table className="admin-table">
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
                      <td>{String(pos.coin || "—")}</td>
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
