"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { TJ_INSTRUMENTS } from "@/lib/journal/constants";
import { buildCurvePoints, buildCurveSVG } from "@/lib/journal/compute";
import { fmtEur, labelInstrument, tjFmtDateTime, tjFmtPrice } from "@/lib/journal/format";
import type { UnifiedTrade } from "@/lib/journal/types";
import { AiRichText } from "./AiRichText";
import {
  IconEdit,
  IconMinus,
  IconTrash,
  IconTrendDown,
  IconTrendUp,
} from "./icons";

const ALL = "all";

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
  onLightbox: (urls: string[], index?: number) => void;
  onDebrief?: (id: string) => void;
  onOpenTrade?: (id: string) => void;
  debriefs?: Record<string, string>;
  debriefBusy?: string | null;
  readOnly?: boolean;
}) {
  const t = useT();
  const [filter, setFilter] = useState(ALL);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const counted = trades.filter((row) => row.r != null || row.eur != null);
  const withR = trades.filter((row) => row.r != null);
  const withEur = trades.filter((row) => row.eur != null);
  const sign = (row: UnifiedTrade) => (row.r != null ? row.r : row.eur ?? 0);
  const wins = counted.filter((row) => sign(row) > 0);
  const losses = counted.filter((row) => sign(row) < 0);
  const totalR = withR.reduce((s, row) => s + (row.r ?? 0), 0);
  const totalEur = withEur.reduce((s, row) => s + (row.eur ?? 0), 0);
  const avgR = withR.length ? totalR / withR.length : 0;
  const avgEur = withEur.length ? totalEur / withEur.length : 0;
  const winRate = counted.length ? (wins.length / counted.length) * 100 : 0;

  const cards = [
    { label: t("journal.tradesLabel"), value: String(counted.length) },
    {
      label: t("journal.winrate"),
      value: counted.length ? `${winRate.toFixed(1)}%` : "—",
    },
    {
      label: t("journal.totalR"),
      value: withR.length
        ? `${totalR >= 0 ? "+" : ""}${totalR.toFixed(2)}R`
        : "—",
      cls: totalR > 0 ? "pos" : totalR < 0 ? "neg" : "",
    },
    {
      label: t("journal.totalEur"),
      value: withEur.length ? fmtEur(totalEur) : "—",
      cls: totalEur > 0 ? "pos" : totalEur < 0 ? "neg" : "",
    },
    {
      label: t("journal.avgR"),
      value: withR.length ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—",
      cls: avgR > 0 ? "pos" : avgR < 0 ? "neg" : "",
    },
    {
      label: t("journal.avgEur"),
      value: withEur.length ? fmtEur(avgEur) : "—",
      cls: avgEur > 0 ? "pos" : avgEur < 0 ? "neg" : "",
    },
    { label: t("journal.win"), value: String(wins.length) },
    { label: t("journal.loss"), value: String(losses.length) },
  ];

  const filtered =
    filter === ALL
      ? trades
      : trades.filter((row) => row.instrument === filter);

  const curveHtml = useMemo(() => {
    const points = buildCurvePoints(
      trades.filter((row) => row.r != null).map((row) => row.r ?? 0),
    );
    return buildCurveSVG(points, "var(--gold)", t("journal.curveEmpty"));
  }, [t, trades]);

  const byInstrument: Record<string, { r: number; n: number; wins: number }> =
    {};
  withR.forEach((row) => {
    byInstrument[row.instrument] = byInstrument[row.instrument] || {
      r: 0,
      n: 0,
      wins: 0,
    };
    byInstrument[row.instrument].r += row.r ?? 0;
    byInstrument[row.instrument].n += 1;
    if ((row.r ?? 0) > 0) byInstrument[row.instrument].wins += 1;
  });

  return (
    <div>
      <div className="tj-eyebrow">{t("journal.eyebrow")}</div>
      <div className="tj-title">{t("journal.title")}</div>

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
            <div className="ttl">{t("journal.log")}</div>
            <select
              className="tj-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value={ALL}>{t("common.all")}</option>
              {TJ_INSTRUMENTS.map((i) => (
                <option key={i} value={i}>
                  {labelInstrument(i, t("journal.other"))}
                </option>
              ))}
            </select>
          </div>
          <div className="tj-log scroll">
            {!filtered.length ? (
              <div className="tj-empty">{t("journal.emptyLog")}</div>
            ) : (
              filtered.map((row) => {
                const icon =
                  (row.r ?? 0) > 0 ? (
                    <IconTrendUp />
                  ) : (row.r ?? 0) < 0 ? (
                    <IconTrendDown />
                  ) : (
                    <IconMinus />
                  );
                const rcls =
                  (row.r ?? 0) > 0 ? "pos" : (row.r ?? 0) < 0 ? "neg" : "flat";
                const rtxt =
                  row.r != null
                    ? `${row.r >= 0 ? "+" : ""}${row.r.toFixed(2)}R`
                    : "—";
                const etxt = row.eur != null ? fmtEur(row.eur) : "";
                return (
                  <div key={row.id}>
                    <div
                      className="tj-row"
                      onClick={() => {
                        const opening = !expanded[row.id];
                        setExpanded((prev) => ({
                          ...prev,
                          [row.id]: !prev[row.id],
                        }));
                        if (opening) onOpenTrade?.(row.id);
                      }}
                    >
                      <div className="icon">{icon}</div>
                      <div className="dt">{row.date}</div>
                      <div className="inst">
                        {labelInstrument(row.instrument, t("journal.other"))}
                        {row.source === "mt5" && (
                          <span className="mt5badge">MT5</span>
                        )}
                        {row.source === "mt5" && row.exit == null && !row.exitTime ? (
                          <span className="mt5badge open">OPEN</span>
                        ) : null}
                      </div>
                      <div
                        className={`dir ${row.direction === "Long" ? "long" : "short"}`}
                      >
                        {row.direction}
                      </div>
                      <div className="prices">
                        {tjFmtPrice(row.entry)}{" "}
                        <span className="arrow">→</span> {tjFmtPrice(row.exit)}
                      </div>
                      {(row.imageUrls || []).length ? (
                        <button
                          type="button"
                          className="thumb-wrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLightbox(row.imageUrls, 0);
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="thumb" src={row.imageUrls[0]} alt="" />
                          {row.imageUrls.length > 1 ? (
                            <span className="thumb-count">
                              +{row.imageUrls.length - 1}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <div style={{ width: 34, flexShrink: 0 }} />
                      )}
                      <div className="tags">
                        {(row.tags || []).map((tag) => (
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
                        (row.source === "mt5" ? (
                          <button
                            className="del"
                            type="button"
                            title={t("journal.addTags")}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnnotate(row.id);
                            }}
                          >
                            <IconEdit />
                          </button>
                        ) : (
                          <button
                            className="del"
                            type="button"
                            title={t("common.delete")}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(row.id);
                            }}
                          >
                            <IconTrash />
                          </button>
                        ))}
                    </div>
                    {expanded[row.id] && (
                      <TradeDetail
                        trade={row}
                        debrief={debriefs?.[row.id]}
                        debriefBusy={debriefBusy === row.id}
                        onDebrief={onDebrief ? () => onDebrief(row.id) : undefined}
                        onLightbox={onLightbox}
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
              {t("journal.equityCurveR")}
            </div>
            <div dangerouslySetInnerHTML={{ __html: curveHtml }} />
          </div>
          <div className="tj-panel">
            <div className="ttl" style={{ marginBottom: 10 }}>
              {t("journal.perInstrumentR")}
            </div>
            {Object.keys(byInstrument).length ? (
              Object.entries(byInstrument).map(([name, d]) => (
                <div className="tj-instrow" key={name}>
                  <span>{labelInstrument(name, t("journal.other"))}</span>
                  <span style={{ color: "var(--paper-dim)" }}>
                    {d.n} {t("common.trades")}
                  </span>
                  <span style={{ color: "var(--paper-dim)" }}>
                    {t("journal.winShort", { pct: ((d.wins / d.n) * 100).toFixed(0) })}
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
  trade: row,
  debrief,
  debriefBusy,
  onDebrief,
  onLightbox,
}: {
  trade: UnifiedTrade;
  debrief?: string;
  debriefBusy?: boolean;
  onDebrief?: () => void;
  onLightbox: (urls: string[], index?: number) => void;
}) {
  const t = useT();
  const rows: [string, string | number][] = [
    [t("journal.entry"), row.entry ?? "—"],
    [t("journal.stopLoss"), row.sl != null ? row.sl : "—"],
    [t("journal.exit"), row.exit ?? "—"],
  ];
  if (row.volume != null)
    rows.push([t("journal.volume"), t("journal.lots", { n: row.volume })]);
  if (row.entryTime) rows.push([t("journal.open"), tjFmtDateTime(row.entryTime)]);
  if (row.exitTime) rows.push([t("journal.close"), tjFmtDateTime(row.exitTime)]);
  if (row.commission != null) rows.push([t("journal.commission"), fmtEur(row.commission)]);
  if (row.swap != null) rows.push([t("journal.swap"), fmtEur(row.swap)]);
  if (row.notes) rows.push([t("journal.note"), row.notes]);

  const shots = row.imageUrls || [];

  return (
    <div className="tj-detail">
      {rows.map(([k, v]) => (
        <div className="tj-detail-row" key={k}>
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </div>
      ))}
      {shots.length ? (
        <div className="tj-detail-shots">
          {shots.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className="tj-detail-shot"
              onClick={(e) => {
                e.stopPropagation();
                onLightbox(shots, i);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={t("journal.screenshotAlt", { n: i + 1 })} />
            </button>
          ))}
        </div>
      ) : null}
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
              {debriefBusy ? t("journal.debriefBusy") : t("journal.debrief")}
            </button>
          ) : (
            <div className="ai-kicker">{t("journal.debrief")}</div>
          )}
          {debriefBusy && !debrief ? (
            <p className="ai-body dim">{t("journal.debriefLoading")}</p>
          ) : debrief ? (
            <AiRichText text={debrief} />
          ) : onDebrief ? null : (
            <p className="ai-body dim">{t("journal.noDebrief")}</p>
          )}
        </div>
      )}
    </div>
  );
}
