"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { MemberPage } from "@/components/platform/MemberPage";
import { fetchMarketNews } from "@/lib/journal/api-client";
import { dateLocale } from "@/lib/i18n";

const FILTERS = ["all", "BTC", "ETH", "XAU", "OIL", "SPX", "MACRO"] as const;

function NewsInner() {
  const { t, locale } = useI18n();
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
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  useEffect(() => {
    fetchMarketNews()
      .then((r) => {
        setItems(r.items || []);
        if (r.error) setError(r.error);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("common.loadFailed")));
  }, [t]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    const key = filter.toLowerCase();
    return items.filter((item) =>
      `${item.title} ${item.categories}`.toLowerCase().includes(key),
    );
  }, [items, filter]);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">{t("news.eyebrow")}</p>
      <h1 className="tj-title">{t("news.title")}</h1>
      <p className="pl-sub">{t("news.lead")}</p>
      <div className="plat-chip-row">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`plat-chip${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? t("news.all") : f}
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
                ? ` · ${new Date(item.publishedAt).toLocaleString(dateLocale(locale))}`
                : ""}
            </div>
            <div className="news-title">{item.title}</div>
            {item.categories ? <div className="pl-sub2">{item.categories}</div> : null}
          </a>
        ))}
      </div>
      {!filtered.length && !error && (
        <div className="pl-empty">
          {items.length ? t("news.noneFilter") : t("news.loading")}
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
