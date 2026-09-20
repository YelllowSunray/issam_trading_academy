"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { MemberPage } from "@/components/platform/MemberPage";
import { SignalCard } from "@/components/signals/SignalCard";
import { fetchSignals } from "@/lib/journal/api-client";
import type { TradeSignal } from "@/lib/signals/types";

function SignalsInner() {
  const t = useT();
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignals()
      .then((d) => {
        setSignals(d.signals);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("common.loadFailed")));
  }, [t]);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">{t("signals.eyebrow")}</p>
      <h1 className="tj-title">{t("signals.title")}</h1>
      <p className="pl-sub">{t("signals.lead")}</p>
      <div className="pl-empty" style={{ marginBottom: 16 }}>
        {t("signals.disclaimer")}
      </div>
      {error && <div className="pl-empty">{error}</div>}
      <div className="sig-list">
        {signals.map((s) => (
          <SignalCard key={s.id} signal={s} />
        ))}
      </div>
      {!signals.length && !error ? (
        <div className="pl-empty">{t("signals.empty")}</div>
      ) : null}
    </div>
  );
}

export default function SignalsPage() {
  return (
    <MemberPage>
      <SignalsInner />
    </MemberPage>
  );
}
