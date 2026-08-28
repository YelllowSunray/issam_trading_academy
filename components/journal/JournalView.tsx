"use client";

import { useMemo, useState } from "react";
import { TJ_INSTRUMENTS } from "@/lib/journal/constants";
import { buildCurvePoints, buildCurveSVG } from "@/lib/journal/compute";
import { fmtEur, tjFmtDateTime, tjFmtPrice } from "@/lib/journal/format";
import type { UnifiedTrade } from "@/lib/journal/types";
import { AiRichText } from "./AiRichText";
import {
  IconEdit,
  IconMinus,
  IconTrash,
  IconTrendDown,
  IconTrendUp,
} from "./icons";

export function JournalView({
  trades,
  onDelete,
  onAnnotate,
  onLightbox,
  onDebrief,
  onOpenTrade,
  debriefs,
  debriefBusy,
  readOnly = false,
}: {
  trades: UnifiedTrade[];
  onDelete: (id: string) => void;
  onAnnotate: (id: string) => void;
  onLightbox: (src: string) => void;
  onDebrief?: (id: string) => void;
  onOpenTrade?: (id: string) => void;
  debriefs?: Record<string, string>;
  debriefBusy?: string | null;
  readOnly?: boolean;
}) {
  const [filter, setFilter] = useState("Alle");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const counted = trades.filter((t) => t.r != null || t.eur != null);
  const withR = trades.filter((t) => t.r != null);
  const withEur = trades.filter((t) => t.eur != null);
  const sign = (t: UnifiedTrade) => (t.r != null ? t.r : t.eur ?? 0);
  const wins = counted.filter((t) => sign(t) > 0);
  const losses = counted.filter((t) => sign(t) < 0);
  const totalR = withR.reduce((s, t) => s + (t.r ?? 0), 0);
  const totalEur = withEur.reduce((s, t) => s + (t.eur ?? 0), 0);
  const avgR = withR.length ? totalR / withR.length : 0;
  const avgEur = withEur.length ? totalEur / withEur.length : 0;
  const winRate = counted.length ? (wins.length / counted.length) * 100 : 0;

  const cards = [
    { label: "Trades", value: String(counted.length) },
    {
      label: "Winrate",
      value: counted.length ? `${winRate.toFixed(1)}%` : "—",
    },
    {
      label: "Totaal R",
      value: withR.length
        ? `${totalR >= 0 ? "+" : ""}${totalR.toFixed(2)}R`
        : "—",
      cls: totalR > 0 ? "pos" : totalR < 0 ? "neg" : "",
    },
    {
      label: "Totaal €",
      value: withEur.length ? fmtEur(totalEur) : "—",
      cls: totalEur > 0 ? "pos" : totalEur < 0 ? "neg" : "",
    },
    {
      label: "Gem. R",
      value: withR.length ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—",
      cls: avgR > 0 ? "pos" : avgR < 0 ? "neg" : "",
    },
    {
      label: "Gem. €",
      value: withEur.length ? fmtEur(avgEur) : "—",
      cls: avgEur > 0 ? "pos" : avgEur < 0 ? "neg" : "",
    },
    { label: "Winst", value: String(wins.length) },
    { label: "Verlies", value: String(losses.length) },
  ];

  const filtered =
    filter === "Alle"
      ? trades
      : trades.filter((t) => t.instrument === filter);

  const curveHtml = useMemo(() => {
    const points = buildCurvePoints(
      trades.filter((t) => t.r != null).map((t) => t.r ?? 0),
    );
    return buildCurveSVG(points, "var(--gold)");
  }, [trades]);

  const byInstrument: Record<string, { r: number; n: number; wins: number }> =
    {};
  withR.forEach((t) => {
    byInstrument[t.instrument] = byInstrument[t.instrument] || {
      r: 0,
      n: 0,
      wins: 0,
    };
    byInstrument[t.instrument].r += t.r ?? 0;
    byInstrument[t.instrument].n += 1;
    if ((t.r ?? 0) > 0) byInstrument[t.instrument].wins += 1;
  });

  return (
    <div>
      <div className="tj-eyebrow">TRADINGACADAMY</div>
      <div className="tj-title">Trade Journal</div>

      <div className="tj-stats">
        {cards.map((c) => {
          const color =
            c.cls === "pos"
              ? "var(--bull)"
              : c.cls === "neg"
                ? "var(--bear)"
                : undefined;
          return (
            <div className="tj-stat" key={c.label}>
              <div className="lbl">{c.label}</div>
              <div className="val" style={color ? { color } : undefined}>
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="tj-main">
        <div className="tj-panel">
          <div className="tj-panel-head">
            <div className="ttl">LOG</div>
            <select
              className="tj-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>Alle</option>
              {TJ_INSTRUMENTS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="tj-log scroll">
            {!filtered.length ? (
              <div className="tj-empty">
                Nog geen trades gelogd. Voeg je eerste trade toe.
              </div>
            ) : (
              filtered.map((t) => {
                const icon =
                  (t.r ?? 0) > 0 ? (
                    <IconTrendUp />
                  ) : (t.r ?? 0) < 0 ? (
                    <IconTrendDown />
                  ) : (
                    <IconMinus />
                  );
                const rcls =
                  (t.r ?? 0) > 0 ? "pos" : (t.r ?? 0) < 0 ? "neg" : "flat";
                const rtxt =
                  t.r != null
                    ? `${t.r >= 0 ? "+" : ""}${t.r.toFixed(2)}R`
                    : "—";
                const etxt = t.eur != null ? fmtEur(t.eur) : "";
                return (
                  <div key={t.id}>
                    <div
                      className="tj-row"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = !prev[t.id];
                          if (next) onOpenTrade?.(t.id);
                          return { ...prev, [t.id]: next };
                        })
                      }
                    >
                      <div className="icon">{icon}</div>
                      <div className="dt">{t.date}</div>
                      <div className="inst">
                        {t.instrument}
                        {t.source === "mt5" && (
                          <span className="mt5badge">MT5</span>
                        )}
                      </div>
                      <div
                        className={`dir ${t.direction === "Long" ? "long" : "short"}`}
                      >
                        {t.direction}
                      </div>
                      <div className="prices">
                        {tjFmtPrice(t.entry)}{" "}
                        <span className="arrow">→</span> {tjFmtPrice(t.exit)}
                      </div>
                      {t.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="thumb"
                          src={t.imageUrl}
                          alt=""
                          onClick={(e) => {
                            e.stopPropagation();
                            onLightbox(t.imageUrl!);
                          }}
                        />
                      ) : (
                        <div style={{ width: 34, flexShrink: 0 }} />
                      )}
                      <div className="tags">
                        {(t.tags || []).map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className={`rval ${rcls}`}>
                        <div className="r">{rtxt}</div>
                        {etxt ? <div className="e">{etxt}</div> : null}
                      </div>
                      {!readOnly &&
                        (t.source === "mt5" ? (
                          <button
                            className="del"
                            type="button"
                            title="Tags/notitie toevoegen"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnnotate(t.id);
                            }}
                          >
                            <IconEdit />
                          </button>
                        ) : (
                          <button
                            className="del"
                            type="button"
                            title="Verwijderen"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(t.id);
                            }}
                          >
                            <IconTrash />
                          </button>
                        ))}
                    </div>
                    {expanded[t.id] && (
                      <TradeDetail
                        trade={t}
                        debrief={debriefs?.[t.id]}
                        debriefBusy={debriefBusy === t.id}
                        onDebrief={onDebrief ? () => onDebrief(t.id) : undefined}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="tj-panel tj-curvebox">
            <div className="ttl" style={{ marginBottom: 8 }}>
              EQUITY CURVE (R)
            </div>
            <div dangerouslySetInnerHTML={{ __html: curveHtml }} />
          </div>
          <div className="tj-panel">
            <div className="ttl" style={{ marginBottom: 10 }}>
              PER INSTRUMENT (R)
            </div>
            {Object.keys(byInstrument).length ? (
              Object.entries(byInstrument).map(([name, d]) => (
                <div className="tj-instrow" key={name}>
                  <span>{name}</span>
                  <span style={{ color: "var(--paper-dim)" }}>
                    {d.n} trades
                  </span>
                  <span style={{ color: "var(--paper-dim)" }}>
                    {((d.wins / d.n) * 100).toFixed(0)}% win
                  </span>
                  <span
                    style={{
                      color: d.r >= 0 ? "var(--bull)" : "var(--bear)",
                      fontWeight: 700,
                    }}
                  >
                    {d.r >= 0 ? "+" : ""}
                    {d.r.toFixed(2)}R
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: "#565a63", fontSize: 12 }}>—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeDetail({
  trade: t,
  debrief,
  debriefBusy,
  onDebrief,
}: {
  trade: UnifiedTrade;
  debrief?: string;
  debriefBusy?: boolean;
  onDebrief?: () => void;
}) {
  const rows: [string, string | number][] = [
    ["Entry", t.entry ?? "—"],
    ["Stop loss", t.sl != null ? t.sl : "—"],
    ["Exit", t.exit ?? "—"],
  ];
  if (t.volume != null) rows.push(["Volume", `${t.volume} lots`]);
  if (t.entryTime) rows.push(["Open", tjFmtDateTime(t.entryTime)]);
  if (t.exitTime) rows.push(["Close", tjFmtDateTime(t.exitTime)]);
  if (t.commission != null) rows.push(["Commissie", fmtEur(t.commission)]);
  if (t.swap != null) rows.push(["Swap", fmtEur(t.swap)]);
  if (t.notes) rows.push(["Notitie", t.notes]);

  return (
    <div className="tj-detail">
      {rows.map(([k, v]) => (
        <div className="tj-detail-row" key={k}>
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </div>
      ))}
      {(onDebrief || debrief || debriefBusy) && (
        <div className="ai-debrief">
          {onDebrief ? (
            <button
              type="button"
              className="pl-reset-btn"
              disabled={debriefBusy}
              onClick={(e) => {
                e.stopPropagation();
                onDebrief();
              }}
            >
              {debriefBusy ? "Debrief…" : "AI debrief"}
            </button>
          ) : (
            <div className="ai-kicker">AI debrief</div>
          )}
          {debriefBusy && !debrief ? (
            <p className="ai-body dim">Debrief laden…</p>
          ) : debrief ? (
            <AiRichText text={debrief} />
          ) : onDebrief ? null : (
            <p className="ai-body dim">Nog geen debrief.</p>
          )}
        </div>
      )}
    </div>
  );
}
