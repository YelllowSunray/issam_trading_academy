"use client";

import { useState } from "react";
import { MemberPage } from "@/components/platform/MemberPage";
import { TradingViewChart } from "@/components/markets/TradingViewChart";
import { MARKET_INSTRUMENTS } from "@/lib/markets/instruments";

function MarketsInner() {
  const [symbol, setSymbol] = useState(MARKET_INSTRUMENTS[0].tvSymbol);
  const current = MARKET_INSTRUMENTS.find((i) => i.tvSymbol === symbol);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">MARKETS</p>
      <h1 className="tj-title">Charts</h1>
      <p className="pl-sub">
        TradingView voor de markten die de community volgt: XAUUSD, WTI, US500,
        BTC en crypto-pairs.
      </p>
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
        {current?.kind === "mt5"
          ? "Klassiek instrument — trades hiervan horen in de MT5-journal."
          : "Crypto-chart ter info. Geen journal-logging vanuit dit scherm."}
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
