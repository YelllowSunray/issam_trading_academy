"use client";

import { useT } from "@/components/i18n/LocaleProvider";
import type { TradeSignal } from "@/lib/signals/types";

export function SignalCard({
  signal,
  compact = false,
}: {
  signal: TradeSignal;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <article className="sig-card">
      <div className="sig-head">
        <strong>{signal.instrument}</strong>
        <span className={`sig-dir ${signal.direction === "Long" ? "long" : "short"}`}>
          {signal.direction}
        </span>
        <span className={`sig-status ${signal.status}`}>{signal.status}</span>
      </div>
      <div className="sig-levels">
        <span>Entry {signal.entry}</span>
        <span>SL {signal.sl}</span>
        {signal.tps.map((tp, i) => (
          <span key={`${tp}-${i}`}>
            TP{i + 1} {tp}
          </span>
        ))}
      </div>
      {!compact && signal.thesis ? <p className="sig-thesis">{signal.thesis}</p> : null}
      <p className="sig-disclaimer">{t("signals.disclaimer")}</p>
    </article>
  );
}
