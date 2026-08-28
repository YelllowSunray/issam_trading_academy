import type { JournalSnapshot } from "./stats";
import { compactSnapshot } from "./stats";

export const COACH_RULES = `Journal-coach TradingAcadamy. Nederlands, kort, geen marketing.
Alleen journal: fouten, patronen, proces, risico.
Verboden: koop/verkoop, long/short, entry, SL, TP, signalen.
Geen winstbeloftes. Geen disclaimer-slot.`;

export function dailyPrompt(snap: JournalSnapshot) {
  return `Dagbriefing ${snap.asOf}. Kern: gisteren (${snap.yesterday}).
Kopjes: 1. Gisteren 2. Patroon 3. Risico 4. Focus (proces, geen instrument).
Max 80 woorden.
${compactSnapshot(snap)}`;
}

export function debriefPrompt(trade: {
  date: string;
  instrument: string;
  direction: string;
  eur: number | null;
  r: number | null;
  notes: string;
}) {
  return `Debrief in 3 korte zinnen. Geen nieuwe trade, geen SL/TP.
${JSON.stringify(trade)}`;
}

export function coachBriefPrompt(snap: JournalSnapshot, name: string) {
  return `3 korte coach-punten voor ${name}. Geen signaal.
${compactSnapshot(snap)}`;
}

export function looksLikeSignalAsk(text: string) {
  const t = text.toLowerCase();
  return (
    /\b(koop|verkoop|buy|sell|long gaan|short gaan|entry|take profit|\btp\b|\bsl\b|stop loss|moet ik|shall i|what should i (buy|sell|trade))\b/.test(
      t,
    ) || /\b(signaal|signal|setup voor morgen|wat traden)\b/.test(t)
  );
}

export const SIGNAL_REFUSAL =
  "Ik geef geen trade-advies. Vraag me over jouw journal: fouten, patronen of proces.";
