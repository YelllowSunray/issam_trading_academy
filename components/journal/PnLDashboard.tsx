"use client";

import { useMemo, useState } from "react";
import { DOW_NL, MONTHS_NL, TJ_SESSIONS } from "@/lib/journal/constants";
import {
  buildCurvePoints,
  buildCurveSVG,
  plComputeExtendedStats,
  plDayOfWeekBreakdown,
  plSessionBreakdown,
} from "@/lib/journal/compute";
import { downloadCsv, tradesToCsv } from "@/lib/journal/csv";
import { fmtEur, fmtEurAbs, plMonthKey, plMonthLabel } from "@/lib/journal/format";
import type { UnifiedTrade } from "@/lib/journal/types";

type Filters = {
  from: string;
  to: string;
  instrument: string;
  source: string;
};

export function PnLDashboard({ trades }: { trades: UnifiedTrade[] }) {
  const [filters, setFilters] = useState<Filters>({
    from: "",
    to: "",
    instrument: "Alle",
    source: "Alle",
  });

  const allEur = useMemo(
    () => trades.filter((t) => t.eur != null),
    [trades],
  );

  const instruments = useMemo(
    () => Array.from(new Set(allEur.map((t) => t.instrument))).sort(),
    [allEur],
  );

  const withEur = useMemo(() => {
    let list = allEur;
    if (filters.from) list = list.filter((t) => t.date >= filters.from);
    if (filters.to) list = list.filter((t) => t.date <= filters.to);
    if (filters.instrument !== "Alle")
      list = list.filter((t) => t.instrument === filters.instrument);
    if (filters.source !== "Alle")
      list = list.filter((t) => t.source === filters.source);
    return list
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [allEur, filters]);

  return (
    <div>
      <div className="pl-title">P&amp;L Dashboard</div>
      <div className="pl-sub">
        Live berekend uit je Trade Journal — geen los rapport, dezelfde cijfers.
      </div>

      <div className="pl-filters">
        <div className="pl-filter-field">
          <label>Van</label>
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
          <label>Tot</label>
          <input
            type="date"
            className="tj-input"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div className="pl-filter-field">
          <label>Instrument</label>
          <select
            className="tj-input"
            value={filters.instrument}
            onChange={(e) =>
              setFilters((f) => ({ ...f, instrument: e.target.value }))
            }
          >
            <option value="Alle">Alle</option>
            {instruments.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="pl-filter-field">
          <label>Bron</label>
          <select
            className="tj-input"
            value={filters.source}
            onChange={(e) =>
              setFilters((f) => ({ ...f, source: e.target.value }))
            }
          >
            <option value="Alle">Alle</option>
            <option value="mt5">MT5</option>
            <option value="manual">Handmatig</option>
          </select>
        </div>
        <button
          type="button"
          className="pl-reset-btn"
          onClick={() =>
            setFilters({
              from: "",
              to: "",
              instrument: "Alle",
              source: "Alle",
            })
          }
        >
          Reset filters
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
          Export CSV
        </button>
      </div>

      {!allEur.length ? (
        <div className="pl-empty">
          Nog geen trades met een risicobedrag (€) ingevuld. Voeg trades toe via
          &quot;Trade toevoegen&quot; en vul het veld <strong>Risico in €</strong>{" "}
          in — dit dashboard vult zich dan automatisch, live uit je journal.
        </div>
      ) : !withEur.length ? (
        <div className="pl-empty">
          Geen trades gevonden voor deze filters. Pas de periode, het instrument
          of de bron aan.
        </div>
      ) : (
        <DashboardBody withEur={withEur} />
      )}
    </div>
  );
}

function DashboardBody({ withEur }: { withEur: UnifiedTrade[] }) {
  const wins = withEur.filter((t) => (t.eur ?? 0) > 0);
  const losses = withEur.filter((t) => (t.eur ?? 0) < 0);
  const totalEur = withEur.reduce((s, t) => s + (t.eur ?? 0), 0);
  const winRate = withEur.length ? (wins.length / withEur.length) * 100 : 0;
  const avgWin = wins.length
    ? wins.reduce((s, t) => s + (t.eur ?? 0), 0) / wins.length
    : 0;
  const avgLoss = losses.length
    ? losses.reduce((s, t) => s + (t.eur ?? 0), 0) / losses.length
    : 0;
  const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;
  const ext = plComputeExtendedStats(withEur);

  const byInstrument: Record<string, { eur: number; n: number; wins: number }> =
    {};
  withEur.forEach((t) => {
    byInstrument[t.instrument] = byInstrument[t.instrument] || {
      eur: 0,
      n: 0,
      wins: 0,
    };
    byInstrument[t.instrument].eur += t.eur ?? 0;
    byInstrument[t.instrument].n += 1;
    if ((t.eur ?? 0) > 0) byInstrument[t.instrument].wins += 1;
  });
  const instKeys = Object.keys(byInstrument);
  const maxAbsInst = Math.max(
    ...instKeys.map((k) => Math.abs(byInstrument[k].eur)),
    1,
  );

  const byMonth: Record<string, { label: string; eur: number }> = {};
  withEur.forEach((t) => {
    const key = plMonthKey(t.date);
    byMonth[key] = byMonth[key] || {
      label: plMonthLabel(t.date, MONTHS_NL),
      eur: 0,
    };
    byMonth[key].eur += t.eur ?? 0;
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
    buildCurvePoints(withEur.map((t) => t.eur ?? 0)),
    "var(--gold)",
  );
  const sess = plSessionBreakdown(withEur);
  const dow = plDayOfWeekBreakdown(withEur);
  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const maxAbsDow = Math.max(...dow.map((x) => Math.abs(x.eur)), 1);

  return (
    <div>
      <div className="pl-section-title">Handelsresultaten</div>
      <div className="pl-kpi-grid">
        <div className="pl-kpi">
          <div className="pl-label">Totaal P/L</div>
          <div className={`pl-value ${totalEur >= 0 ? "pl-green" : "pl-red"}`}>
            {fmtEur(totalEur)}
          </div>
          <div className="pl-sub2">{withEur.length} trades met €-invoer</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">Win Rate</div>
          <div className="pl-value">{winRate.toFixed(1)}%</div>
          <div className="pl-sub2">
            {wins.length} win · {losses.length} loss
          </div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">Gem. Winnende Trade</div>
          <div className="pl-value pl-green">
            {wins.length ? fmtEur(avgWin) : "—"}
          </div>
          <div className="pl-sub2">
            Gem. verlies: {losses.length ? fmtEur(avgLoss) : "—"}
          </div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">Reward/Risk Ratio</div>
          <div
            className={`pl-value${rr != null && rr >= 1 ? " pl-green" : ""}`}
          >
            {rr != null ? rr.toFixed(2) : "—"}
          </div>
          <div className="pl-sub2">Gem. winst ÷ gem. verlies</div>
        </div>
      </div>

      <div className="pl-kpi-grid" style={{ marginTop: 10 }}>
        <div className="pl-kpi">
          <div className="pl-label">Max Drawdown</div>
          <div className="pl-value pl-red">-{fmtEurAbs(ext.maxDrawdown)}</div>
          <div className="pl-sub2">Grootste daling vanaf een piek</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">Profit Factor</div>
          <div
            className={`pl-value${ext.profitFactor != null && ext.profitFactor >= 1 ? " pl-green" : ""}`}
          >
            {ext.profitFactor != null ? ext.profitFactor.toFixed(2) : "—"}
          </div>
          <div className="pl-sub2">Bruto winst ÷ bruto verlies</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">Langste Winstreak</div>
          <div className="pl-value pl-green">{ext.maxWinStreak}</div>
          <div className="pl-sub2">trades op rij gewonnen</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-label">Langste Verliesstreak</div>
          <div className="pl-value pl-red">{ext.maxLossStreak}</div>
          <div className="pl-sub2">trades op rij verloren</div>
        </div>
      </div>

      <div className="pl-section-title">Equity Curve (€)</div>
      <div
        className="pl-month-chart"
        dangerouslySetInnerHTML={{ __html: eurCurve }}
      />

      <div className="pl-section-title">Per Instrument</div>
      <div className="pl-inst-grid">
        {instKeys.map((name) => {
          const d = byInstrument[name];
          const width = Math.max(4, (Math.abs(d.eur) / maxAbsInst) * 100);
          const col = d.eur >= 0 ? "#22c55e" : "#ef4444";
          return (
            <div className="pl-inst-card" key={name}>
              <div className="pl-inst-header">
                <div className="pl-inst-name">{name}</div>
                <div className="pl-inst-pl" style={{ color: col }}>
                  {fmtEur(d.eur)}
                </div>
              </div>
              <div className="pl-inst-stats">
                <div className="pl-inst-stat">
                  <div className="lbl">Trades</div>
                  <div className="val">{d.n}</div>
                </div>
                <div className="pl-inst-stat">
                  <div className="lbl">Win Rate</div>
                  <div className="val">
                    {((d.wins / d.n) * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="pl-inst-stat">
                  <div className="lbl">Gem./trade</div>
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

      <div className="pl-section-title">Maandelijks P/L</div>
      <div className="pl-month-chart">
        <div
          style={{
            fontSize: 11,
            color: "var(--paper-dim)",
            marginBottom: 4,
          }}
        >
          Netto P/L per maand, op basis van trades met €-invoer
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

      <div className="pl-section-title">Top Trades</div>
      <div className="pl-two-col">
        <div className="pl-card">
          <div className="pl-label" style={{ color: "#22c55e" }}>
            Beste Trade
          </div>
          <div className="pl-value pl-green" style={{ marginTop: 6 }}>
            {best ? fmtEur(best.eur ?? 0) : "—"}
          </div>
          <div className="pl-sub2" style={{ marginTop: 6 }}>
            {best
              ? `${best.instrument} ${best.direction} · ${best.date}`
              : "—"}
          </div>
        </div>
        <div className="pl-card">
          <div className="pl-label" style={{ color: "#ef4444" }}>
            Slechtste Trade
          </div>
          <div className="pl-value pl-red" style={{ marginTop: 6 }}>
            {worst ? fmtEur(worst.eur ?? 0) : "—"}
          </div>
          <div className="pl-sub2" style={{ marginTop: 6 }}>
            {worst
              ? `${worst.instrument} ${worst.direction} · ${worst.date}`
              : "—"}
          </div>
        </div>
      </div>

      <div className="pl-section-title">Beste / Slechtste Dag</div>
      <div className="pl-two-col">
        <div className="pl-card">
          <div className="pl-label" style={{ color: "#22c55e" }}>
            Beste Dag
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
            Slechtste Dag
          </div>
          <div className="pl-value pl-red" style={{ marginTop: 6 }}>
            {ext.worstDay != null ? fmtEur(ext.worstDayEur ?? 0) : "—"}
          </div>
          <div className="pl-sub2" style={{ marginTop: 6 }}>
            {ext.worstDay || "—"}
          </div>
        </div>
      </div>

      <div className="pl-section-title">Per Sessie</div>
      {sess.counted === 0 ? (
        <div className="pl-empty">
          Geen sessie-data beschikbaar (alleen MT5-trades hebben een open-tijd).
        </div>
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
                      <div className="lbl">Trades</div>
                      <div className="val">{d.n}</div>
                    </div>
                    <div className="pl-inst-stat">
                      <div className="lbl">Win Rate</div>
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
              Gebaseerd op {sess.counted} van {withEur.length} trades met een
              bekende open-tijd (alleen MT5-trades).
            </div>
          )}
        </>
      )}

      <div className="pl-section-title">Per Dag van de Week</div>
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
                <div className="pl-bar-label">{DOW_NL[idx]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pl-note">
        Alle cijfers hierboven zijn live afgeleid uit je Trade Journal (R ×
        ingevuld risico in €, of het echte MT5-resultaat). Trades zonder
        ingevuld risicobedrag tellen niet mee in dit dashboard, maar wel in de
        R-cijfers op het Journal-tabblad. Filters hierboven passen alle cijfers
        en grafieken op deze pagina aan.
      </div>
    </div>
  );
}
