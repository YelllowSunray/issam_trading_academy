"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { MemberPage } from "@/components/platform/MemberPage";
import { TradingViewCalendar } from "@/components/markets/TradingViewChart";

function num(v: string) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function ToolsInner() {
  const t = useT();
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("2340");
  const [sl, setSl] = useState("2330");
  const [tickValue, setTickValue] = useState("1");
  const [tickSize, setTickSize] = useState("0.1");
  const [target, setTarget] = useState("2360");

  const size = useMemo(() => {
    const riskEur = num(balance) * (num(riskPct) / 100);
    const stop = Math.abs(num(entry) - num(sl));
    const perLot = (stop / (num(tickSize) || 1)) * (num(tickValue) || 1);
    const lots = perLot > 0 ? riskEur / perLot : 0;
    const reward = Math.abs(num(target) - num(entry));
    const rr = stop > 0 ? reward / stop : 0;
    return { riskEur, stop, lots, rr, reward };
  }, [balance, riskPct, entry, sl, tickValue, tickSize, target]);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">{t("tools.eyebrow")}</p>
      <h1 className="tj-title">{t("tools.title")}</h1>
      <p className="pl-sub">{t("tools.lead")}</p>

      <div className="pl-two-col">
        <section className="tj-panel">
          <div className="ttl">Position size</div>
          <div className="tools-grid">
            <label>
              Account (€)
              <input className="tj-input" value={balance} onChange={(e) => setBalance(e.target.value)} />
            </label>
            <label>
              Risk %
              <input className="tj-input" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
            </label>
            <label>
              Entry
              <input className="tj-input" value={entry} onChange={(e) => setEntry(e.target.value)} />
            </label>
            <label>
              SL
              <input className="tj-input" value={sl} onChange={(e) => setSl(e.target.value)} />
            </label>
            <label>
              Tick size
              <input className="tj-input" value={tickSize} onChange={(e) => setTickSize(e.target.value)} />
            </label>
            <label>
              Tick value (€)
              <input className="tj-input" value={tickValue} onChange={(e) => setTickValue(e.target.value)} />
            </label>
          </div>
          <div className="pl-kpi-grid" style={{ marginTop: 16 }}>
            <div className="pl-kpi">
              <div className="pl-label">{t("tools.risk")}</div>
              <div className="pl-value">€{size.riskEur.toFixed(2)}</div>
            </div>
            <div className="pl-kpi">
              <div className="pl-label">Lots / size</div>
              <div className="pl-value">{size.lots.toFixed(2)}</div>
            </div>
          </div>
        </section>

        <section className="tj-panel">
          <div className="ttl">Risk / Reward</div>
          <label>
            Target
            <input className="tj-input" value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <div className="pl-kpi-grid" style={{ marginTop: 16 }}>
            <div className="pl-kpi">
              <div className="pl-label">{t("tools.slDistance")}</div>
              <div className="pl-value">{size.stop.toFixed(2)}</div>
            </div>
            <div className="pl-kpi">
              <div className="pl-label">R:R</div>
              <div className="pl-value">{size.rr.toFixed(2)}</div>
            </div>
          </div>
          <p className="pl-sub2" style={{ marginTop: 12 }}>
            {t("tools.rrNote", {
              reward: size.reward.toFixed(2),
              stop: size.stop.toFixed(2),
            })}
          </p>
        </section>
      </div>

      <section className="tj-panel" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div className="ttl" style={{ padding: "16px 18px 0" }}>
          {t("tools.calendar")}
        </div>
        <TradingViewCalendar />
      </section>
    </div>
  );
}

export default function ToolsPage() {
  return (
    <MemberPage>
      <ToolsInner />
    </MemberPage>
  );
}
