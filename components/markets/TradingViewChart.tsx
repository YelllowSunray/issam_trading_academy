"use client";

import { useEffect, useRef } from "react";

export function TradingViewChart({
  symbol,
  height = 420,
  locale = "en",
  interval = "60",
  range,
  hideToolbar = false,
}: {
  symbol: string;
  height?: number;
  locale?: string;
  interval?: string;
  range?: string;
  hideToolbar?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tvLocale = locale === "nl" ? "nl_NL" : "en";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      ...(range ? { range } : {}),
      timezone: "Europe/Amsterdam",
      theme: "dark",
      style: "1",
      locale: tvLocale,
      hide_top_toolbar: hideToolbar,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, [symbol, tvLocale, interval, range, hideToolbar]);

  return (
    <div className="tv-wrap" style={{ height }}>
      <div className="tradingview-widget-container" ref={ref} />
    </div>
  );
}

export function TradingViewCalendar() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      width: "100%",
      height: "100%",
      locale: "nl_NL",
      importanceFilter: "0,1",
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, []);

  return (
    <div className="tv-wrap" style={{ height: 480 }}>
      <div className="tradingview-widget-container" ref={ref} />
    </div>
  );
}
