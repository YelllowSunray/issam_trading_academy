import { enrichTrades, mergeTrades } from "@/lib/journal/compute";
import { listAnnotations, listManualTrades } from "@/lib/journal/store";
import { listAccounts, listTrades } from "@/lib/mt5/store";
import type { UnifiedTrade } from "@/lib/journal/types";
import { AI_LIMITS } from "./limits";

export type JournalSnapshot = {
  asOf: string;
  yesterday: string;
  totals: {
    trades: number;
    wins: number;
    losses: number;
    winRate: number | null;
    eur: number | null;
    r: number | null;
  };
  yesterdayStats: {
    trades: number;
    wins: number;
    losses: number;
    eur: number | null;
  };
  byInstrument: Array<{ name: string; n: number; eur: number; winRate: number }>;
  recent: Array<{
    id: string;
    date: string;
    instrument: string;
    direction: string;
    eur: number | null;
    r: number | null;
    notes: string;
  }>;
};

function amsterdamDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(iso: string, delta: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return amsterdamDate(d);
}

export function todayAmsterdam() {
  return amsterdamDate();
}

export async function loadUserJournal(uid: string): Promise<UnifiedTrade[]> {
  const [manual, annotations, accounts] = await Promise.all([
    listManualTrades(uid),
    listAnnotations(uid),
    listAccounts(uid),
  ]);
  const chunks = await Promise.all(
    accounts.map((a) => listTrades(uid, a.login)),
  );
  return enrichTrades(mergeTrades(manual, chunks.flat(), annotations));
}

export function buildSnapshot(trades: UnifiedTrade[]): JournalSnapshot {
  const asOf = todayAmsterdam();
  const yesterday = addDays(asOf, -1);
  const counted = trades.filter((t) => t.r != null || t.eur != null);
  const sign = (t: UnifiedTrade) => (t.r != null ? t.r : t.eur ?? 0);
  const wins = counted.filter((t) => sign(t) > 0);
  const losses = counted.filter((t) => sign(t) < 0);
  const eurVals = counted.filter((t) => t.eur != null);
  const rVals = counted.filter((t) => t.r != null);
  const y = counted.filter((t) => t.date === yesterday);
  const yWins = y.filter((t) => sign(t) > 0);

  const byInst: Record<string, { n: number; eur: number; wins: number }> = {};
  counted.forEach((t) => {
    const name = t.instrument || "Overig";
    const row = byInst[name] || { n: 0, eur: 0, wins: 0 };
    row.n += 1;
    row.eur += t.eur ?? 0;
    if (sign(t) > 0) row.wins += 1;
    byInst[name] = row;
  });

  return {
    asOf,
    yesterday,
    totals: {
      trades: counted.length,
      wins: wins.length,
      losses: losses.length,
      winRate: counted.length
        ? Math.round((wins.length / counted.length) * 1000) / 10
        : null,
      eur: eurVals.length
        ? eurVals.reduce((s, t) => s + (t.eur ?? 0), 0)
        : null,
      r: rVals.length ? rVals.reduce((s, t) => s + (t.r ?? 0), 0) : null,
    },
    yesterdayStats: {
      trades: y.length,
      wins: yWins.length,
      losses: y.length - yWins.length,
      eur: y.length ? y.reduce((s, t) => s + (t.eur ?? 0), 0) : null,
    },
    byInstrument: Object.entries(byInst)
      .map(([name, d]) => ({
        name,
        n: d.n,
        eur: Math.round(d.eur * 10) / 10,
        winRate: d.n ? Math.round((d.wins / d.n) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, AI_LIMITS.instruments),
    recent: counted.slice(0, AI_LIMITS.recentTrades).map((t) => ({
      id: t.id,
      date: t.date,
      instrument: t.instrument,
      direction: t.direction,
      eur: t.eur != null ? Math.round(t.eur * 10) / 10 : null,
      r: t.r != null ? Math.round(t.r * 100) / 100 : null,
      notes: (t.notes || "").slice(0, AI_LIMITS.noteChars),
    })),
  };
}

export function compactSnapshot(snap: JournalSnapshot) {
  return JSON.stringify({
    asOf: snap.asOf,
    y: snap.yesterday,
    tot: snap.totals,
    yest: snap.yesterdayStats,
    inst: snap.byInstrument,
    rec: snap.recent.map(({ date, instrument, direction, eur, r }) => ({
      date,
      instrument,
      direction,
      eur,
      r,
    })),
  });
}
