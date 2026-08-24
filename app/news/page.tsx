"use client";

import { useEffect, useMemo, useState } from "react";
import { MemberPage } from "@/components/platform/MemberPage";
import { fetchMarketNews } from "@/lib/journal/api-client";

const FILTERS = ["Alles", "BTC", "ETH", "XAU", "OIL", "SPX", "MACRO"];

function NewsInner() {
  const [items, setItems] = useState<
    Array<{
      id: string;
      title: string;
      url: string;
      source: string;
      publishedAt: string | null;
      categories: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("Alles");

  useEffect(() => {
    fetchMarketNews()
      .then((r) => {
        setItems(r.items || []);
        if (r.error) setError(r.error);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "Alles") return items;
    const key = filter.toLowerCase();
    return items.filter((item) =>
      `${item.title} ${item.categories}`.toLowerCase().includes(key),
    );
  }, [items, filter]);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">NIEUWS</p>
      <h1 className="tj-title">Markt & crypto</h1>
      <p className="pl-sub">
        Feed gefilterd op instrumenten die de community volgt. Bron: CryptoPanic
        of CryptoCompare.
      </p>
      <div className="plat-chip-row">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`plat-chip${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {error && <div className="pl-empty">{error}</div>}
      <div className="news-list">
        {filtered.map((item) => (
          <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="news-item">
            <div className="pl-label">
              {item.source}
              {item.publishedAt
                ? ` · ${new Date(item.publishedAt).toLocaleString("nl-NL")}`
                : ""}
            </div>
            <div className="news-title">{item.title}</div>
            {item.categories ? <div className="pl-sub2">{item.categories}</div> : null}
          </a>
        ))}
      </div>
      {!filtered.length && !error && (
        <div className="pl-empty">
          {items.length
            ? "Geen items voor deze filter."
            : "Nieuws laden…"}
        </div>
      )}
    </div>
  );
}

export default function NewsPage() {
  return (
    <MemberPage>
      <NewsInner />
    </MemberPage>
  );
}
