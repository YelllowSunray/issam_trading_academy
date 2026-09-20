"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { TJ_SESSIONS } from "@/lib/journal/constants";
import {
  buildCurvePoints,
  buildCurveSVG,
  plComputeExtendedStats,
  plDayOfWeekBreakdown,
  plSessionBreakdown,
} from "@/lib/journal/compute";
import { downloadCsv, tradesToCsv } from "@/lib/journal/csv";
import { fmtEur, fmtEurAbs, labelInstrument, plMonthKey, plMonthLabel } from "@/lib/journal/format";
import type { UnifiedTrade } from "@/lib/journal/types";

const ALL = "all";

type Filters = {
  from: string;
  to: string;
  instrument: string;
  source: string;
};

export function PnLDashboard({ trades }: { trades: UnifiedTrade[] }) {
  const t = useT();
  const [filters, setFilters] = useState<Filters>({
    from: "",
    to: "",
    instrument: ALL,
    source: ALL,
  });

  const allEur = useMemo(
    () => trades.filter((row) => row.eur != null),
    [trades],
  );

  const instruments = useMemo(
    () => Array.from(new Set(allEur.map((row) => row.instrument))).sort(),
    [allEur],
  );

  const withEur = useMemo(() => {
    let list = allEur;
    if (filters.from) list = list.filter((row) => row.date >= filters.from);
    if (filters.to) list = list.filter((row) => row.date <= filters.to);
    if (filters.instrument !== ALL)
      list = list.filter((row) => row.instrument === filters.instrument);
    if (filters.source !== ALL)
      list = list.filter((row) => row.source === filters.source);
    return list
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [allEur, filters]);

  return (
    <div>
      <div className="pl-title">{t("journal.pnlTitle")}</div>
      <div className="pl-sub">{t("journal.pnlLead")}</div>

      <div className="pl-filters">
        <div className="pl-filter-field">
          <label>{t("journal.from")}</label>
          <input
            type="date"
            className="tj-input"
            value={filters.from}
            onChange={(e) =>
              setFilters((f) => ({ ...f, from: e.target.value }))
            }
          />
        </div>
        <div className="pl-filter-field">
          <label>{t("journal.to")}</label>
          <input
            type="date"
            className="tj-input"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div className="pl-filter-field">
          <label>{t("journal.instrument")}</label>
          <select
            className="tj-input"
            value={filters.instrument}
            onChange={(e) =>
              setFilters((f) => ({ ...f, instrument: e.target.value }))
            }
          >
            <option value={ALL}>{t("common.all")}</option>
            {instruments.map((i) => (
              <option key={i} value={i}>
                {labelInstrument(i, t("journal.other"))}
              </option>
            ))}
          </select>
        </div>
        <div className="pl-filter-field">
          <label>{t("journal.source")}</label>
          <select
            className="tj-input"
            value={filters.source}
            onChange={(e) =>
              setFilters((f) => ({ ...f, source: e.target.value }))
            }
          >
            <option value={ALL}>{t("common.all")}</option>
            <option value="mt5">MT5</option>
            <option value="manual">{t("journal.manual")}</option>
          </select>
        </div>
        <button
          type="button"
          className="pl-reset-btn"
          onClick={() =>
            setFilters({
              from: "",
              to: "",
              instrument: ALL,
              source: ALL,
            })
          }
        >
          {t("journal.resetFilters")}
        </button>
        <button
          type="button"
          className="pl-reset-btn pl-export-btn"
          onClick={() => {
            const csv = tradesToCsv(withEur.length ? withEur : allEur);
            downloadCsv(
              `trading-journal-${new Date().toISOString().slice(0, 10)}.csv`,
              csv,
            );
          }}
        >
          {t("journal.exportCsv")}
        </button>
      </div>

      {!allEur.length ? (
        <div className="pl-empty">{t("journal.emptyRisk")}</div>
      ) : !withEur.length ? (
        <div className="pl-empty">{t("journal.emptyFilter")}</div>
      ) : (
        <DashboardBody withEur={withEur} />
      )}
    </div>
  );
}

function DashboardBody({ withEur }: { withEur: UnifiedTrade[] }) {
  const t = useT();
  const months = [
    t("months.jan"),
    t("months.feb"),
    t("months.mar"),
    t("months.apr"),
    t("months.may"),
    t("months.jun"),
    t("months.jul"),
    t("months.aug"),
    t("months.sep"),
    t("months.oct"),
    t("months.nov"),
    t("months.dec"),
  ];
  const dowLabels = [
    t("dow.sun"),
    t("dow.mon"),
    t("dow.tue"),
    t("dow.wed"),
    t("dow.thu"),
    t("dow.fri"),
    t("dow.sat"),
  ];

  const wins = withEur.filter((row) => (row.eur ?? 0) > 0);
  const losses = withEur.filter((row) => (row.eur ?? 0) < 0);
  const totalEur = withEur.reduce((s, row) => s + (row.eur ?? 0), 0);
  const winRate = withEur.length ? (wins.length / withEur.length) * 100 : 0;
  const avgWin = wins.length
    ? wins.reduce((s, row) => s + (row.eur ?? 0), 0) / wins.length
    : 0;
  const avgLoss = losses.length
    ? losses.reduce((s, row) => s + (row.eur ?? 0), 0) / losses.length
    : 0;
  const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;
  const ext = plComputeExtendedStats(withEur);

  const byInstrument: Record<string, { eur: number; n: number; wins: number }> =
    {};
  withEur.forEach((row) => {
    byInstrument[row.instrument] = byInstrument[row.instrument] || {
      eur: 0,
      n: 0,
      wins: 0,
    };
    byInstrument[row.instrument].eur += row.eur ?? 0;
    byInstrument[row.instrument].n += 1;
    if ((row.eur ?? 0) > 0) byInstrument[row.instrument].wins += 1;
  });
  const instKeys = Object.keys(byInstrument);
  const maxAbsInst = Math.max(
    ...instKeys.map((k) => Math.abs(byInstrument[k].eur)),
    1,
  );

  const byMonth: Record<string, { label: string; eur: number }> = {};
  withEur.forEach((row) => {
    const key = plMonthKey(row.date);
    byMonth[key] = byMonth[key] || {
      label: plMonthLabel(row.date, months),
      eur: 0,
    };
    byMonth[key].eur += row.eur ?? 0;
  });
  const monthKeys = Object.keys(byMonth).sort();
  const maxAbsMonth = Math.max(
    ...monthKeys.map((k) => Math.abs(byMonth[k].eur)),
    1,
  );

  const best = withEur.reduce(
    (a, b) => (a === null || (b.eur ?? 0) > (a.eur ?? 0) ? b : a),
    null as UnifiedTrade | null,
  );
  const worst = withEur.reduce(
    (a, b) => (a === null || (b.eur ?? 0) < (a.eur ?? 0) ? b : a),
    null as UnifiedTrade | null,
  );

  const eurCurve = buildCurveSVG(
    buildCurvePoints(withEur.map((row) => row.eur ?? 0)),
    "var(--gold)",
    t("journal.curveEmpty"),
  );
  const sess = plSessionBreakdown(withEur);
  const dow = plDayOfWeekBreakdown(withEur);
  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const maxAbsDow = Math.max(...dow.map((x) => Math.abs(x.eur)), 1);

  return (
    <div>
      <div className="pl-section-title">{t("journal.results")}</div>
      <div className="pl-kpi-grid">
        <div className="pl-kpi">
          <div className="pl-label">{t("journal.totalPnl")}</div>
          <div className={`pl-value ${totalEur >= 0 ? "pl-green" : "pl-red"}`}>
            {fmtEur(totalEur)}
          </div>
          <div className="pl-sub2">
            {t("journal.tradesWithEur", { n: withEur.length })}
          </div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">{t("journal.winrate")}</div>
          <div className="pl-value">{winRate.toFixed(1)}%</div>
          <div className="pl-sub2">
            {t("journal.winLossCount", {
              wins: wins.length,
              losses: losses.length,
            })}
          </div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">{t("journal.avgWinning")}</div>
          <div className="pl-value pl-green">
            {wins.length ? fmtEur(avgWin) : "—"}
          </div>
          <div className="pl-sub2">
            {t("journal.avgLossLabel", {
              value: losses.length ? fmtEur(avgLoss) : "—",
            })}
          </div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">{t("journal.rrRatio")}</div>
          <div
            className={`pl-value${rr != null && rr >= 1 ? " pl-green" : ""}`}
          >
            {rr != null ? rr.toFixed(2) : "—"}
          </div>
          <div className="pl-sub2">{t("journal.avgWinOverLoss")}</div>
        </div>
      </div>

      <div className="pl-kpi-grid" style={{ marginTop: 10 }}>
        <div className="pl-kpi">
          <div className="pl-label">{t("journal.maxDrawdownLabel")}</div>
          <div className="pl-value pl-red">-{fmtEurAbs(ext.maxDrawdown)}</div>
          <div className="pl-sub2">{t("journal.maxDrawdown")}</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">{t("journal.profitFactor")}</div>
          <div
            className={`pl-value${ext.profitFactor != null && ext.profitFactor >= 1 ? " pl-green" : ""}`}
          >
            {ext.profitFactor != null ? ext.profitFactor.toFixed(2) : "—"}
          </div>
          <div className="pl-sub2">{t("journal.grossRatio")}</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">{t("journal.longestWinStreak")}</div>
          <div className="pl-value pl-green">{ext.maxWinStreak}</div>
          <div className="pl-sub2">{t("journal.wonInARow")}</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">{t("journal.longestLossStreak")}</div>
          <div className="pl-value pl-red">{ext.maxLossStreak}</div>
          <div className="pl-sub2">{t("journal.lostInARow")}</div>
        </div>
      </div>

      <div className="pl-section-title">{t("journal.equityCurveEur")}</div>
      <div
        className="pl-month-chart"
        dangerouslySetInnerHTML={{ __html: eurCurve }}
      />

      <div className="pl-section-title">{t("journal.perInstrument")}</div>
      <div className="pl-inst-grid">
        {instKeys.map((name) => {
          const d = byInstrument[name];
          const width = Math.max(4, (Math.abs(d.eur) / maxAbsInst) * 100);
          const col = d.eur >= 0 ? "#22c55e" : "#ef4444";
          return (
            <div className="pl-inst-card" key={name}>
              <div className="pl-inst-header">
                <div className="pl-inst-name">{labelInstrument(name, t("journal.other"))}</div>
                <div className="pl-inst-pl" style={{ color: col }}>
                  {fmtEur(d.eur)}
                </div>
              </div>
              <div className="pl-inst-stats">
                <div className="pl-inst-stat">
                  <div className="lbl">{t("journal.tradesLabel")}</div>
                  <div className="val">{d.n}</div>
                </div>
                <div className="pl-inst-stat">
                  <div className="lbl">{t("journal.winrate")}</div>
                  <div className="val">
                    {((d.wins / d.n) * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="pl-inst-stat">
                  <div className="lbl">{t("journal.avgPerTrade")}</div>
                  <div className="val" style={{ color: col }}>
                    {fmtEur(d.eur / d.n)}
                  </div>
                </div>
              </div>
              <div className="pl-prog-bg">
                <div
                  className="pl-prog-fill"
                  style={{ width: `${width}%`, background: col }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pl-section-title">{t("journal.monthlyPnl")}</div>
      <div className="pl-month-chart">
        <div
          style={{
            fontSize: 11,
            color: "var(--paper-dim)",
            marginBottom: 4,
          }}
        >
          {t("journal.monthlyNet")}
        </div>
        <div className="pl-bars">
          {monthKeys.map((k) => {
            const m = byMonth[k];
            const h = Math.max(6, (Math.abs(m.eur) / maxAbsMonth) * 100);
            const col = m.eur >= 0 ? "#22c55e" : "#ef4444";
            return (
              <div className="pl-bar-group" key={k}>
                <div className="pl-bar-val" style={{ color: col }}>
                  {fmtEur(m.eur)}
                </div>
                <div
                  className="pl-bar"
                  style={{ height: h, background: col }}
                />
                <div className="pl-bar-label">{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pl-section-title">{t("journal.topTrades")}</div>
      <div className="pl-two-col">
        <div className="pl-card">
          <div className="pl-label" style={{ color: "#22c55e" }}>
            {t("journal.bestTrade")}
          </div>
          <div className="pl-value pl-green" style={{ marginTop: 6 }}>
            {best ? fmtEur(best.eur ?? 0) : "—"}
          </div>
          <div className="pl-sub2" style={{ marginTop: 6 }}>
            {best
              ? `${labelInstrument(best.instrument, t("journal.other"))} ${best.direction} · ${best.date}`
              : "—"}
          </div>
        </div>
        <div className="pl-card">
          <div className="pl-label" style={{ color: "#ef4444" }}>
            {t("journal.worstTrade")}
          </div>
          <div className="pl-value pl-red" style={{ marginTop: 6 }}>
            {worst ? fmtEur(worst.eur ?? 0) : "—"}
          </div>
          <div className="pl-sub2" style={{ marginTop: 6 }}>
            {worst
              ? `${labelInstrument(worst.instrument, t("journal.other"))} ${worst.direction} · ${worst.date}`
              : "—"}
          </div>
        </div>
      </div>

      <div className="pl-section-title">{t("journal.bestWorstDay")}</div>
      <div className="pl-two-col">
        <div className="pl-card">
          <div className="pl-label" style={{ color: "#22c55e" }}>
            {t("journal.bestDay")}
          </div>
          <div className="pl-value pl-green" style={{ marginTop: 6 }}>
            {ext.bestDay != null ? fmtEur(ext.bestDayEur ?? 0) : "—"}
          </div>
          <div className="pl-sub2" style={{ marginTop: 6 }}>
            {ext.bestDay || "—"}
          </div>
        </div>
        <div className="pl-card">
          <div className="pl-label" style={{ color: "#ef4444" }}>
            {t("journal.worstDay")}
          </div>
          <div className="pl-value pl-red" style={{ marginTop: 6 }}>
            {ext.worstDay != null ? fmtEur(ext.worstDayEur ?? 0) : "—"}
          </div>
          <div className="pl-sub2" style={{ marginTop: 6 }}>
            {ext.worstDay || "—"}
          </div>
        </div>
      </div>

      <div className="pl-section-title">{t("journal.perSession")}</div>
      {sess.counted === 0 ? (
        <div className="pl-empty">{t("journal.noSessionData")}</div>
      ) : (
        <>
          <div className="pl-inst-grid">
            {TJ_SESSIONS.map((s) => {
              const d = sess.byS[s.name];
              const col = d.eur >= 0 ? "#22c55e" : "#ef4444";
              return (
                <div className="pl-inst-card" key={s.name}>
                  <div className="pl-inst-header">
                    <div className="pl-inst-name">{s.name}</div>
                    <div className="pl-inst-pl" style={{ color: col }}>
                      {d.n ? fmtEur(d.eur) : "—"}
                    </div>
                  </div>
                  <div className="pl-inst-stats">
                    <div className="pl-inst-stat">
                      <div className="lbl">{t("journal.tradesLabel")}</div>
                      <div className="val">{d.n}</div>
                    </div>
                    <div className="pl-inst-stat">
                      <div className="lbl">{t("journal.winrate")}</div>
                      <div className="val">
                        {d.n ? `${((d.wins / d.n) * 100).toFixed(0)}%` : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {sess.counted < withEur.length && (
            <div className="pl-sub2" style={{ marginTop: 8 }}>
              {t("journal.sessionBased", {
                counted: sess.counted,
                total: withEur.length,
              })}
            </div>
          )}
        </>
      )}

      <div className="pl-section-title">{t("journal.perDow")}</div>
      <div className="pl-month-chart">
        <div className="pl-bars">
          {dowOrder.map((idx) => {
            const d = dow[idx];
            const h = d.n ? Math.max(6, (Math.abs(d.eur) / maxAbsDow) * 100) : 4;
            const col = d.eur >= 0 ? "#22c55e" : "#ef4444";
            return (
              <div className="pl-bar-group" key={idx}>
                <div
                  className="pl-bar-val"
                  style={{ color: d.n ? col : "#444" }}
                >
                  {d.n ? fmtEur(d.eur) : "—"}
                </div>
                <div
                  className="pl-bar"
                  style={{
                    height: h,
                    background: d.n ? col : "#2a2a2a",
                  }}
                />
                <div className="pl-bar-label">{dowLabels[idx]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pl-note">{t("journal.pnlFooter")}</div>
    </div>
  );
}
