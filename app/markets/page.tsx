"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { MemberPage } from "@/components/platform/MemberPage";
import { TradingViewChart } from "@/components/markets/TradingViewChart";
import { MARKET_INSTRUMENTS } from "@/lib/markets/instruments";

function MarketsInner() {
  const t = useT();
  const [symbol, setSymbol] = useState(MARKET_INSTRUMENTS[0].tvSymbol);
  const current = MARKET_INSTRUMENTS.find((i) => i.tvSymbol === symbol);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">{t("markets.eyebrow")}</p>
      <h1 className="tj-title">{t("markets.title")}</h1>
      <p className="pl-sub">{t("markets.lead")}</p>
      <div className="plat-chip-row">
        {MARKET_INSTRUMENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`plat-chip${symbol === item.tvSymbol ? " active" : ""}`}
            onClick={() => setSymbol(item.tvSymbol)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="tj-panel" style={{ padding: 0, overflow: "hidden" }}>
        <TradingViewChart symbol={symbol} height={520} />
      </div>
      <p className="pl-sub2">
        {current?.kind === "mt5" ? t("markets.mt5") : t("markets.crypto")}
      </p>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <MemberPage>
      <MarketsInner />
    </MemberPage>
  );
}
