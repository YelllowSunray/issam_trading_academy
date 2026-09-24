"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { TradingViewChart } from "@/components/markets/TradingViewChart";
import { MARKET_INSTRUMENTS } from "@/lib/markets/instruments";

export function MarketsChartPanel({
  height = 400,
  showCaption = true,
  showChips = true,
  symbol: controlledSymbol,
  onSymbolChange,
  interval = "60",
  range,
  hideToolbar = false,
}: {
  height?: number;
  showCaption?: boolean;
  showChips?: boolean;
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
  interval?: string;
  range?: string;
  hideToolbar?: boolean;
}) {
  const { t, locale } = useI18n();
  const [internal, setInternal] = useState(MARKET_INSTRUMENTS[0].tvSymbol);
  const symbol = controlledSymbol ?? internal;
  const current = MARKET_INSTRUMENTS.find((item) => item.tvSymbol === symbol);

  function setSymbol(next: string) {
    if (controlledSymbol === undefined) setInternal(next);
    onSymbolChange?.(next);
  }

  return (
    <div className="markets-chart-panel">
      {showChips ? (
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
      ) : null}
      <div className="markets-chart-frame">
        <TradingViewChart
          symbol={symbol}
          height={height}
          locale={locale}
          interval={interval}
          range={range}
          hideToolbar={hideToolbar}
        />
      </div>
      {showCaption ? (
        <p className="pl-sub2">
          {current?.kind === "mt5" ? t("markets.mt5") : t("markets.crypto")}
        </p>
      ) : null}
    </div>
  );
}
