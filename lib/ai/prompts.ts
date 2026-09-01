import type { JournalSnapshot } from "./stats";
import { compactSnapshot } from "./stats";

export const COACH_RULES = `Journal-coach TradingAcadamy. Nederlands, kort, geen marketing.
Alleen DIT journal: fouten, patronen, proces, risico. Geen trades of P/L van andere accounts.
Verboden: koop/verkoop, long/short, entry, SL, TP, signalen.
Geen winstbeloftes. Geen disclaimer-slot.
Geen markdown: geen **, geen #, geen bullets met -.`;

export function dailyPrompt(snap: JournalSnapshot) {
  return `Dagbriefing ${snap.asOf} voor ${snap.owner} (alleen DIT journal).
Kern: gisteren (${snap.yesterday}).
${snap.empty ? "Dit journal is leeg: verzin geen trades, geen P/L, geen patronen uit andere accounts." : "Gebruik alleen de cijfers hieronder. Geen trades verzinnen."}
Exact deze 4 regels-kopjes, elk op een eigen regel, zonder sterretjes:
1. Gisteren
2. Patroon
3. Risico
4. Focus
Max 80 woorden. Geen markdown.
${compactSnapshot(snap)}`;
}

export function emptyDailyBrief(owner: string, date: string) {
  const who = owner.trim() || "Dit journal";
  return `1. Gisteren
${who} heeft nog geen trades in dit journal. Geen P/L om te reviewen.
2. Patroon
Nog te weinig data. Niets overnemen van andere accounts.
3. Risico
Eerst loggen via MT5 of handmatig, daarna pas evalueren.
4. Focus
Koppel het juiste MT5-account of log een trade. Briefing van ${date}.`;
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
  return `3 korte coach-punten voor ${name}. Alleen dit journal. Geen signaal.
${snap.empty ? "Journal is leeg: verzin geen trades." : ""}
${compactSnapshot(snap)}`;
}

export const EMPTY_CHAT =
  "Dit journal heeft nog geen trades. Koppel eerst MT5 of log een trade, dan kan ik patronen en risico bespreken.";

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
