import type { Locale } from "@/lib/i18n/locale";
import type { JournalSnapshot } from "./stats";
import { compactSnapshot } from "./stats";

export function coachRules(locale: Locale) {
  if (locale === "nl") {
    return `Journal-coach Tradechain. Nederlands, kort, geen marketing.
Alleen DIT journal: fouten, patronen, proces, risico. Geen trades of P/L van andere accounts.
Verboden: koop/verkoop, long/short, entry, SL, TP, signalen.
Geen winstbeloftes. Geen disclaimer-slot.
Geen markdown: geen **, geen #, geen bullets met -.`;
  }
  return `Tradechain journal coach. English, short, no marketing.
Only THIS journal: mistakes, patterns, process, risk. No trades or P/L from other accounts.
Forbidden: buy/sell, long/short, entry, SL, TP, signals.
No profit promises. No disclaimer closer.
No markdown: no **, no #, no dash bullets.`;
}

export function dailyPrompt(snap: JournalSnapshot, locale: Locale = "en") {
  if (locale === "nl") {
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
  return `Daily briefing ${snap.asOf} for ${snap.owner} (THIS journal only).
Core: yesterday (${snap.yesterday}).
${snap.empty ? "This journal is empty: invent no trades, no P/L, no patterns from other accounts." : "Use only the figures below. Do not invent trades."}
Exactly these 4 headings, each on its own line, no asterisks:
1. Yesterday
2. Pattern
3. Risk
4. Focus
Max 80 words. No markdown.
${compactSnapshot(snap)}`;
}

export function emptyDailyBrief(owner: string, date: string, locale: Locale = "en") {
  const who = owner.trim() || (locale === "nl" ? "Dit journal" : "This journal");
  if (locale === "nl") {
    return `1. Gisteren
${who} heeft nog geen trades in dit journal. Geen P/L om te reviewen.
2. Patroon
Nog te weinig data. Niets overnemen van andere accounts.
3. Risico
Eerst loggen via MT5 of handmatig, daarna pas evalueren.
4. Focus
Koppel het juiste MT5-account of log een trade. Briefing van ${date}.`;
  }
  return `1. Yesterday
${who} has no trades in this journal yet. No P/L to review.
2. Pattern
Too little data. Do not copy from other accounts.
3. Risk
Log via MT5 or manually first, then evaluate.
4. Focus
Connect the right MT5 account or log a trade. Briefing for ${date}.`;
}

export function debriefPrompt(
  trade: {
    date: string;
    instrument: string;
    direction: string;
    eur: number | null;
    r: number | null;
    notes: string;
  },
  locale: Locale = "en",
) {
  if (locale === "nl") {
    return `Debrief in 3 korte zinnen. Geen nieuwe trade, geen SL/TP.
${JSON.stringify(trade)}`;
  }
  return `Debrief in 3 short sentences. No new trade, no SL/TP.
${JSON.stringify(trade)}`;
}

export function coachBriefPrompt(
  snap: JournalSnapshot,
  name: string,
  locale: Locale = "en",
) {
  if (locale === "nl") {
    return `3 korte coach-punten voor ${name}. Alleen dit journal. Geen signaal.
${snap.empty ? "Journal is leeg: verzin geen trades." : ""}
${compactSnapshot(snap)}`;
  }
  return `3 short coach points for ${name}. This journal only. No signal.
${snap.empty ? "Journal is empty: invent no trades." : ""}
${compactSnapshot(snap)}`;
}

export function emptyChat(locale: Locale = "en") {
  return locale === "nl"
    ? "Dit journal heeft nog geen trades. Koppel eerst MT5 of log een trade, dan kan ik patronen en risico bespreken."
    : "This journal has no trades yet. Connect MT5 or log a trade first, then I can discuss patterns and risk.";
}

export function looksLikeSignalAsk(text: string) {
  const t = text.toLowerCase();
  return (
    /\b(koop|verkoop|buy|sell|long gaan|short gaan|entry|take profit|\btp\b|\bsl\b|stop loss|moet ik|shall i|what should i (buy|sell|trade))\b/.test(
      t,
    ) || /\b(signaal|signal|setup voor morgen|wat traden)\b/.test(t)
  );
}

export function signalRefusal(locale: Locale = "en") {
  return locale === "nl"
    ? "Ik geef geen trade-advies. Vraag me over jouw journal: fouten, patronen of proces."
    : "I don’t give trade advice. Ask me about your journal: mistakes, patterns or process.";
}

export const COACH_RULES = coachRules("en");
export const EMPTY_CHAT = emptyChat("en");
export const SIGNAL_REFUSAL = signalRefusal("en");
