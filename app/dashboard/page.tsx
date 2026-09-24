"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { MarketsChartPanel } from "@/components/markets/MarketsChartPanel";
import { MemberPage } from "@/components/platform/MemberPage";
import { SignalCard } from "@/components/signals/SignalCard";
import { instrumentForTicker } from "@/lib/markets/instruments";
import {
  deleteGoal,
  fetchDashboard,
  fetchMarketNews,
  fetchMarketTickers,
  saveGoal,
} from "@/lib/journal/api-client";
import { tjIsSessionActive } from "@/lib/journal/compute";
import { fmtEur } from "@/lib/journal/format";
import { TJ_SESSIONS } from "@/lib/journal/constants";
import type { GoalItem } from "@/lib/goals/types";
import type { TradeSignal } from "@/lib/signals/types";

type Dash = {
  lastSignal: TradeSignal | null;
  academy: {
    completed: number;
    total: number;
    nextCourseId: string | null;
    nextCourseTitle: string | null;
  };
  community: {
    linked: boolean;
    telegramUsername: string | null;
    tier: "vip" | "normal";
    publicChannel: string;
  };
  pnl: {
    totalEur: number | null;
    tradeCount: number;
    lastDate: string | null;
  };
  goals: GoalItem[];
};

type Ticker = {
  id: string;
  symbol: string;
  badge: string;
  price: number | null;
  change24h: number | null;
};

type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
};

function greeting(hour: number, t: (key: string) => string) {
  if (hour < 12) return t("dashboard.morning");
  if (hour < 18) return t("dashboard.afternoon");
  return t("dashboard.evening");
}

function firstName(value?: string | null, fallback = "trader") {
  const name = (value || "").trim();
  return name.split(/\s+/)[0] || fallback;
}

function hoursUntil(from: number, to: number) {
  return (to - from + 24) % 24;
}

function formatPrice(n: number | null, symbol: string) {
  if (n == null) return "—";
  if (symbol.startsWith("XAU") || n >= 1000) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (n >= 10) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function DashboardInner() {
  const { profile, asUser, coachTarget } = useAuth();
  const { t, locale } = useI18n();
  const readOnly = Boolean(asUser && asUser !== profile?.uid);
  const [data, setData] = useState<Dash | null>(null);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const selectedInstrument = selectedTicker
    ? instrumentForTicker(selectedTicker)
    : null;

  function openTickerChart(tickerId: string) {
    setSelectedTicker(tickerId);
  }

  useEffect(() => {
    if (!selectedTicker) return;
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedTicker]);

  const load = useCallback(() => {
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : t("common.loadFailed")));
    fetchMarketTickers()
      .then((d) => setTickers(d.tickers || []))
      .catch(() => {});
    fetchMarketNews()
      .then((d) => setNews((d.items || []).slice(0, 5)))
      .catch(() => {});
  }, [t]);

  useEffect(() => {
    load();
  }, [load, asUser]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const amsterdamHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  const utcHour = now.getUTCHours();
  const name = firstName(
    readOnly ? coachTarget?.displayName : profile?.displayName,
    t("dashboard.trader"),
  );
  const amsterdamClock = new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
  const utcClock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  const sessions = useMemo(() => {
    const pick = (name: string, label: string) => {
      const s = TJ_SESSIONS.find((row) => row.name === name);
      if (!s) return null;
      const on = tjIsSessionActive(s, utcHour);
      const hrs = on
        ? hoursUntil(utcHour, s.end)
        : hoursUntil(utcHour, s.start);
      return {
        label,
        on,
        caption: on
          ? t("dashboard.sessionOpen", { hrs })
          : t("dashboard.sessionClosed", { hrs }),
      };
    };
    return [
      pick("London", "London"),
      pick("New York", "New York"),
      pick("Sydney", "Sydney"),
      pick("Tokyo", "Asia"),
    ].filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [utcHour, t]);

  return (
    <div className="journal-main">
      <div className="desk-hello">
        <div>
          <h1>
            {greeting(amsterdamHour, t)}, {name}.
          </h1>
          <p>{t("dashboard.desk")}</p>
        </div>
        <div className="desk-clocks">
          <div>
            Amsterdam
            <strong>{amsterdamClock}</strong>
          </div>
          <div>
            UTC
            <strong>{utcClock}</strong>
          </div>
        </div>
      </div>

      {error && <div className="pl-empty">{error}</div>}

      <div className="session-strip">
        {sessions.map((s) => (
          <div key={s.label} className={`session-pill${s.on ? " on" : ""}`}>
            <div className="name">{s.label}</div>
            <div className="state">{s.caption}</div>
          </div>
        ))}
      </div>

      {tickers.length ? (
        <div className="ticker-row">
          {tickers.map((row) => {
            const up = (row.change24h ?? 0) >= 0;
            const active = selectedTicker === row.id;
            return (
              <button
                key={row.id}
                type="button"
                className={`ticker-card${active ? " active" : ""}`}
                onClick={() => openTickerChart(row.id)}
              >
                <div className="sym">
                  {row.badge} · {row.symbol}
                </div>
                <div className="px">{formatPrice(row.price, row.symbol)}</div>
                <div className={up ? "chg-up" : "chg-down"}>
                  {row.change24h == null
                    ? "—"
                    : `${up ? "+" : ""}${row.change24h.toFixed(2)}%`}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="desk-layout">
        <div className="desk-primary">
          <section className="tj-panel" style={{ marginBottom: 0 }}>
            <div className="ttl">{t("dashboard.marketDesk")}</div>
            <p className="pl-sub2" style={{ marginBottom: 12 }}>
              {t("dashboard.marketLead")}
            </p>
            {tickers.length ? (
              <div className="bias-grid">
                {tickers.map((row) => {
                  const up = (row.change24h ?? 0) >= 0;
                  const active = selectedTicker === row.id;
                  return (
                    <button
                      key={`${row.id}-bias`}
                      type="button"
                      className={`bias-card${active ? " active" : ""}`}
                      onClick={() => openTickerChart(row.id)}
                    >
                      <header>
                        <h3>{row.symbol}</h3>
                        <span className={up ? "chg-up" : "chg-down"}>
                          {row.change24h == null
                            ? "—"
                            : `${up ? "+" : ""}${row.change24h.toFixed(2)}% · ${up ? "Bullish" : "Bearish"}`}
                        </span>
                      </header>
                      <p className="pl-sub2" style={{ marginTop: 8 }}>
                        {t("dashboard.bias", { price: formatPrice(row.price, row.symbol) })}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="pl-sub2">{t("dashboard.pricesLoading")}</p>
            )}
            {selectedInstrument ? (
              <div ref={chartRef} className="desk-inline-chart">
                <div className="dx-panel-head">
                  <div className="ttl">
                    {selectedInstrument.label} · {t("dashboard.chart24h")}
                  </div>
                  <button
                    type="button"
                    className="pl-reset-btn"
                    onClick={() => setSelectedTicker(null)}
                  >
                    {t("common.close")}
                  </button>
                </div>
                <MarketsChartPanel
                  height={320}
                  showCaption={false}
                  showChips={false}
                  symbol={selectedInstrument.tvSymbol}
                  interval="15"
                  range="1D"
                  hideToolbar
                />
              </div>
            ) : null}
          </section>

          {!selectedInstrument ? (
            <section className="tj-panel desk-charts" style={{ marginBottom: 0 }}>
              <div className="dx-panel-head">
                <div className="ttl">{t("dashboard.charts")}</div>
                <Link href="/markets" className="pl-reset-btn">
                  {t("dashboard.openCharts")}
                </Link>
              </div>
              <p className="pl-sub2" style={{ marginBottom: 12 }}>
                {t("dashboard.chartsLead")}
              </p>
              <MarketsChartPanel height={360} showCaption={false} />
            </section>
          ) : null}
        </div>

        <section className="tj-panel" style={{ marginBottom: 0 }}>
          <div className="ttl">{t("dashboard.capitalFlow")}</div>
          <p className="pl-sub2" style={{ marginBottom: 12 }}>
            {t("dashboard.headlinesLead")}
          </p>
          <div className="news-list">
            {news.map((item) => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                {item.title}
                <div className="src">{item.source}</div>
              </a>
            ))}
            {!news.length ? (
              <p className="pl-sub2">{t("dashboard.noHeadlines")}</p>
            ) : null}
          </div>
          <Link href="/news" className="pl-reset-btn" style={{ marginTop: 12 }}>
            {t("dashboard.allNews")}
          </Link>
        </section>
      </div>

      <div className="dash-grid">
        <section className="tj-panel">
          <div className="ttl">{t("dashboard.lastSignal")}</div>
          {data?.lastSignal ? (
            <>
              <SignalCard signal={data.lastSignal} compact />
              <Link href="/signals" className="pl-reset-btn" style={{ marginTop: 10 }}>
                {t("dashboard.allSignals")}
              </Link>
            </>
          ) : (
            <p className="pl-sub2">{t("dashboard.noSignals")}</p>
          )}
        </section>

        <section className="tj-panel">
          <div className="ttl">Academy</div>
          <p className="pl-value" style={{ margin: "8px 0" }}>
            {data
              ? t("dashboard.academyLessons", {
                  done: data.academy.completed,
                  total: data.academy.total,
                })
              : "—"}
          </p>
          {data?.academy.nextCourseTitle ? (
            <p className="pl-sub2">
              {t("dashboard.next", { title: data.academy.nextCourseTitle })}
            </p>
          ) : (
            <p className="pl-sub2">{t("dashboard.allDone")}</p>
          )}
          <div className="plat-chip-row" style={{ marginTop: 12 }}>
            <Link href="/learn" className="tb-addbtn" style={{ textDecoration: "none" }}>
              {t("dashboard.openAcademy")}
            </Link>
            <Link href="/learn/certificates" className="pl-reset-btn">
              {t("coach.certificates")}
            </Link>
          </div>
        </section>

        <section className="tj-panel">
          <div className="ttl">Community</div>
          <p className="pl-sub2">
            {data?.community.linked
              ? t("dashboard.communityLinked", {
                  user: data.community.telegramUsername || t("dashboard.linked"),
                  tier:
                    data.community.tier === "vip"
                      ? t("dashboard.vipGroup")
                      : t("dashboard.normalGroup"),
                })
              : t("dashboard.communityUnlinked")}
          </p>
          <div className="plat-chip-row" style={{ marginTop: 12 }}>
            <Link href="/community" className="tb-addbtn" style={{ textDecoration: "none" }}>
              {t("dashboard.openCommunity")}
            </Link>
            {data?.community.publicChannel ? (
              <a
                href={data.community.publicChannel}
                target="_blank"
                rel="noreferrer"
                className="pl-reset-btn"
              >
                {t("dashboard.publicChannel")}
              </a>
            ) : null}
          </div>
        </section>

        <section className="tj-panel">
          <div className="ttl">{t("dashboard.pnlSnapshot")}</div>
          <p className="pl-value" style={{ margin: "8px 0" }}>
            {data?.pnl.totalEur != null ? fmtEur(data.pnl.totalEur) : "—"}
          </p>
          <p className="pl-sub2">
            {data?.pnl.tradeCount ?? 0} {t("common.trades")}
            {data?.pnl.lastDate
              ? t("dashboard.lastOn", { date: data.pnl.lastDate })
              : ""}
          </p>
          <Link href="/journal#dashboard" className="pl-reset-btn" style={{ marginTop: 12 }}>
            Journal &amp; P&amp;L
          </Link>
        </section>
      </div>

      <section className="tj-panel" style={{ marginTop: 16 }}>
        <div className="ttl">{t("dashboard.goalsTitle")}</div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          {t("dashboard.goalsLead")}
        </p>
        {!readOnly ? (
          <form
            className="plat-inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) return;
              setBusy(true);
              try {
                await saveGoal({ title: title.trim() });
                setTitle("");
                load();
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              className="tj-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("dashboard.goalPlaceholder")}
            />
            <button className="tb-addbtn" type="submit" disabled={busy}>
              {t("common.add")}
            </button>
          </form>
        ) : null}
        <ul className="goal-list">
          {(data?.goals || []).map((g) => (
            <li key={g.id}>
              <label>
                <input
                  type="checkbox"
                  checked={g.done}
                  disabled={readOnly}
                  onChange={async () => {
                    if (readOnly) return;
                    await saveGoal({ id: g.id, title: g.title, done: !g.done });
                    load();
                  }}
                />
                <span className={g.done ? "done" : ""}>{g.title}</span>
              </label>
              {!readOnly ? (
                <button
                  type="button"
                  className="pl-reset-btn"
                  onClick={async () => {
                    await deleteGoal(g.id);
                    load();
                  }}
                >
                  {t("common.remove")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {!data?.goals.length ? (
          <p className="pl-sub2">{t("dashboard.noGoals")}</p>
        ) : null}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <MemberPage>
      <DashboardInner />
    </MemberPage>
  );
}
