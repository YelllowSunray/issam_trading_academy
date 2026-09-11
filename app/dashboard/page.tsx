"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MemberPage } from "@/components/platform/MemberPage";
import { SignalCard } from "@/components/signals/SignalCard";
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

function greetingNl(hour: number) {
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

function firstName(value?: string | null) {
  const name = (value || "").trim();
  return name.split(/\s+/)[0] || "trader";
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
  const readOnly = Boolean(asUser && asUser !== profile?.uid);
  const [data, setData] = useState<Dash | null>(null);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(() => {
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
    fetchMarketTickers()
      .then((d) => setTickers(d.tickers || []))
      .catch(() => {});
    fetchMarketNews()
      .then((d) => setNews((d.items || []).slice(0, 5)))
      .catch(() => {});
  }, []);

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
  );
  const amsterdamClock = new Intl.DateTimeFormat("nl-NL", {
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
        caption: on ? `Open · sluit over ${hrs}u` : `Opent over ${hrs}u`,
      };
    };
    return [
      pick("London", "London"),
      pick("New York", "New York"),
      pick("Sydney", "Sydney"),
      pick("Tokyo", "Asia"),
    ].filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [utcHour]);

  return (
    <div className="journal-main">
      <div className="desk-hello">
        <div>
          <h1>
            {greetingNl(amsterdamHour)}, {name}.
          </h1>
          <p>Je desk · live markten, journal en academy.</p>
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
          {tickers.map((t) => {
            const up = (t.change24h ?? 0) >= 0;
            return (
              <div key={t.id} className="ticker-card">
                <div className="sym">
                  {t.badge} · {t.symbol}
                </div>
                <div className="px">{formatPrice(t.price, t.symbol)}</div>
                <div className={up ? "chg-up" : "chg-down"}>
                  {t.change24h == null
                    ? "—"
                    : `${up ? "+" : ""}${t.change24h.toFixed(2)}%`}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="desk-layout">
        <section className="tj-panel" style={{ marginBottom: 0 }}>
          <div className="ttl">Market desk</div>
          <p className="pl-sub2" style={{ marginBottom: 12 }}>
            24u-beweging, geen AI-signaal.
          </p>
          {tickers.length ? (
            <div className="bias-grid">
              {tickers.map((t) => {
                const up = (t.change24h ?? 0) >= 0;
                return (
                  <article key={`${t.id}-bias`} className="bias-card">
                    <header>
                      <h3>{t.symbol}</h3>
                      <span className={up ? "chg-up" : "chg-down"}>
                        {t.change24h == null
                          ? "—"
                          : `${up ? "+" : ""}${t.change24h.toFixed(2)}% · ${up ? "Bullish" : "Bearish"}`}
                      </span>
                    </header>
                    <p className="pl-sub2" style={{ marginTop: 8 }}>
                      Spot {formatPrice(t.price, t.symbol)}. Bias volgt alleen de
                      24-uursverandering.
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="pl-sub2">Prijzen laden…</p>
          )}
        </section>

        <section className="tj-panel" style={{ marginBottom: 0 }}>
          <div className="ttl">Capital flow</div>
          <p className="pl-sub2" style={{ marginBottom: 12 }}>
            Headlines uit de news-feed.
          </p>
          <div className="news-list">
            {news.map((item) => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                {item.title}
                <div className="src">{item.source}</div>
              </a>
            ))}
            {!news.length ? (
              <p className="pl-sub2">Nog geen headlines geladen.</p>
            ) : null}
          </div>
          <Link href="/news" className="pl-reset-btn" style={{ marginTop: 12 }}>
            Alle news
          </Link>
        </section>
      </div>

      <div className="dash-grid">
        <section className="tj-panel">
          <div className="ttl">Laatste signaal</div>
          {data?.lastSignal ? (
            <>
              <SignalCard signal={data.lastSignal} compact />
              <Link href="/signals" className="pl-reset-btn" style={{ marginTop: 10 }}>
                Alle signalen
              </Link>
            </>
          ) : (
            <p className="pl-sub2">Nog geen signalen. Issam plaatst ze in Admin.</p>
          )}
        </section>

        <section className="tj-panel">
          <div className="ttl">Academy</div>
          <p className="pl-value" style={{ margin: "8px 0" }}>
            {data ? `${data.academy.completed}/${data.academy.total}` : "—"} lessen
          </p>
          {data?.academy.nextCourseTitle ? (
            <p className="pl-sub2">Volgende: {data.academy.nextCourseTitle}</p>
          ) : (
            <p className="pl-sub2">Alle gepubliceerde lessen afgerond.</p>
          )}
          <div className="plat-chip-row" style={{ marginTop: 12 }}>
            <Link href="/learn" className="tb-addbtn" style={{ textDecoration: "none" }}>
              Open academy
            </Link>
            <Link href="/learn/certificates" className="pl-reset-btn">
              Certificates
            </Link>
          </div>
        </section>

        <section className="tj-panel">
          <div className="ttl">Community</div>
          <p className="pl-sub2">
            {data?.community.linked
              ? `Telegram @${data.community.telegramUsername || "gekoppeld"} · ${data.community.tier === "vip" ? "VIP-groep" : "normale groep"}`
              : "Koppel Telegram voor je persoonlijke groepsinvite."}
          </p>
          <div className="plat-chip-row" style={{ marginTop: 12 }}>
            <Link href="/community" className="tb-addbtn" style={{ textDecoration: "none" }}>
              Open community
            </Link>
            {data?.community.publicChannel ? (
              <a
                href={data.community.publicChannel}
                target="_blank"
                rel="noreferrer"
                className="pl-reset-btn"
              >
                Publieke channel
              </a>
            ) : null}
          </div>
        </section>

        <section className="tj-panel">
          <div className="ttl">P&amp;L snapshot</div>
          <p className="pl-value" style={{ margin: "8px 0" }}>
            {data?.pnl.totalEur != null ? fmtEur(data.pnl.totalEur) : "—"}
          </p>
          <p className="pl-sub2">
            {data?.pnl.tradeCount ?? 0} trades
            {data?.pnl.lastDate ? ` · laatst ${data.pnl.lastDate}` : ""}
          </p>
          <Link href="/journal#dashboard" className="pl-reset-btn" style={{ marginTop: 12 }}>
            Journal &amp; P&amp;L
          </Link>
        </section>
      </div>

      <section className="tj-panel" style={{ marginTop: 16 }}>
        <div className="ttl">Goals &amp; checkpoints</div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          Korte tracker. Geen aparte pagina.
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
              placeholder="Nieuw checkpoint…"
            />
            <button className="tb-addbtn" type="submit" disabled={busy}>
              Toevoegen
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
                  Weg
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {!data?.goals.length ? (
          <p className="pl-sub2">Nog geen checkpoints. Zet er één voor deze week.</p>
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
