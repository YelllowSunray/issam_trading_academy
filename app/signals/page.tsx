"use client";

import { useEffect, useState } from "react";
import { MemberPage } from "@/components/platform/MemberPage";
import { SignalCard } from "@/components/signals/SignalCard";
import { fetchSignals } from "@/lib/journal/api-client";
import { SIGNAL_DISCLAIMER, type TradeSignal } from "@/lib/signals/types";

function SignalsInner() {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [disclaimer, setDisclaimer] = useState(SIGNAL_DISCLAIMER);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignals()
      .then((d) => {
        setSignals(d.signals);
        setDisclaimer(d.disclaimer);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, []);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">CALLS</p>
      <h1 className="tj-title">Signals</h1>
      <p className="pl-sub">
        Entry, SL, TP en rationale. Geen automatische executie — jij handelt
        zelf.
      </p>
      <div className="pl-empty" style={{ marginBottom: 16 }}>
        {disclaimer}
      </div>
      {error && <div className="pl-empty">{error}</div>}
      <div className="sig-list">
        {signals.map((s) => (
          <SignalCard key={s.id} signal={s} />
        ))}
      </div>
      {!signals.length && !error ? (
        <div className="pl-empty">
          Nog geen calls. Dit is de gedeelde academy-feed, geen journal per
          student. Plaats een signaal in Admin → Signalen.
        </div>
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
