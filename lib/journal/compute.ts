import { TJ_SESSIONS } from "./constants";
import type {
  ManualTrade,
  Mt5Trade,
  SessionDef,
  TradeAnnotation,
  UnifiedTrade,
} from "./types";

export function tjIsSessionActive(s: SessionDef, h: number) {
  return s.start < s.end
    ? h >= s.start && h < s.end
    : h >= s.start || h < s.end;
}

export function tjComputeR(t: {
  entry: string | number | null;
  sl: string | number | null;
  exit: string | number | null;
  direction: string;
}) {
  const entry = parseFloat(String(t.entry));
  const sl = parseFloat(String(t.sl));
  const exit = parseFloat(String(t.exit));
  if (Number.isNaN(entry) || Number.isNaN(sl) || Number.isNaN(exit) || entry === sl)
    return null;
  const risk = Math.abs(entry - sl);
  const dir = t.direction === "Short" ? -1 : 1;
  const reward = (exit - entry) * dir;
  return reward / risk;
}

export function tjComputeEur(t: { riskEur: string | number | null }, r: number | null) {
  if (r === null) return null;
  const riskEur = parseFloat(String(t.riskEur));
  if (Number.isNaN(riskEur) || riskEur <= 0) return null;
  return r * riskEur;
}

export function mergeTrades(
  manual: ManualTrade[],
  mt5: Mt5Trade[],
  annotations: Record<string, TradeAnnotation>,
): UnifiedTrade[] {
  const manualMapped: UnifiedTrade[] = manual.map((t) => ({
    id: t.id,
    source: "manual",
    date: t.date,
    instrument: t.instrument,
    direction: t.direction,
    entry: t.entry,
    sl: t.sl,
    exit: t.exit,
    riskEur: t.riskEur,
    tags: t.tags || [],
    notes: t.notes || "",
    imageUrl: t.imageUrl || null,
  }));

  const mt5Mapped: UnifiedTrade[] = mt5.map((t) => {
    const ann = annotations[t.id] || { tags: [], notes: "", imageUrl: null };
    return {
      id: t.id,
      source: "mt5",
      date: t.date,
      instrument: t.instrument,
      direction: t.direction,
      entry: t.entry,
      sl: t.sl,
      exit: t.exit,
      riskEur: null,
      volume: t.volume,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      commission: t.commission,
      swap: t.swap,
      login: t.login,
      tags: ann.tags || [],
      notes: ann.notes || "",
      imageUrl: ann.imageUrl || null,
      _mt5Profit: t.profitEur,
    };
  });

  return [...manualMapped, ...mt5Mapped];
}

export function enrichTrades(trades: UnifiedTrade[]): UnifiedTrade[] {
  return trades
    .map((t) => {
      const r = tjComputeR(t);
      const eur = t.source === "mt5" ? (t._mt5Profit ?? null) : tjComputeEur(t, r);
      return { ...t, r, eur };
    })
    .slice()
    .reverse();
}

export function buildCurvePoints(values: number[]) {
  let cum = 0;
  return values.map((v, i) => {
    cum += v;
    return { i: i + 1, v: parseFloat(cum.toFixed(2)) };
  });
}

export function buildCurveSVG(
  points: { i: number; v: number }[],
  strokeColor: string,
) {
  if (points.length < 2) {
    return '<div class="tj-curve-empty">Nog te weinig data voor een curve.</div>';
  }
  const W = 480;
  const H = 180;
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 18;
  const ys = points.map((p) => p.v);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const rangeY = maxY - minY || 1;
  const xScale = (i: number) =>
    padL + ((i - 1) / (points.length - 1)) * (W - padL - padR);
  const yScale = (v: number) =>
    padT + (1 - (v - minY) / rangeY) * (H - padT - padB);
  const pts = points
    .map((p) => `${xScale(p.i).toFixed(1)},${yScale(p.v).toFixed(1)}`)
    .join(" ");
  const zeroY = yScale(0).toFixed(1);
  return (
    `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:180px;display:block;">` +
    `<line x1="${padL}" y1="${zeroY}" x2="${W - padR}" y2="${zeroY}" stroke="var(--line-strong)" stroke-width="1"/>` +
    `<polyline points="${pts}" fill="none" stroke="${strokeColor}" stroke-width="2"/>` +
    `</svg>`
  );
}

export function plComputeExtendedStats(withEur: UnifiedTrade[]) {
  const wins = withEur.filter((t) => (t.eur ?? 0) > 0);
  const losses = withEur.filter((t) => (t.eur ?? 0) < 0);
  const grossProfit = wins.reduce((s, t) => s + (t.eur ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.eur ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  let cum = 0;
  let peak = 0;
  let maxDD = 0;
  withEur.forEach((t) => {
    cum += t.eur ?? 0;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDD) maxDD = dd;
  });

  let curWin = 0;
  let curLoss = 0;
  let maxWin = 0;
  let maxLoss = 0;
  withEur.forEach((t) => {
    const eur = t.eur ?? 0;
    if (eur > 0) {
      curWin++;
      curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else if (eur < 0) {
      curLoss++;
      curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    } else {
      curWin = 0;
      curLoss = 0;
    }
  });

  const byDay: Record<string, number> = {};
  withEur.forEach((t) => {
    byDay[t.date] = (byDay[t.date] || 0) + (t.eur ?? 0);
  });
  const dayKeys = Object.keys(byDay);
  let bestDay: string | null = null;
  let worstDay: string | null = null;
  dayKeys.forEach((d) => {
    if (bestDay === null || byDay[d] > byDay[bestDay]) bestDay = d;
    if (worstDay === null || byDay[d] < byDay[worstDay]) worstDay = d;
  });

  return {
    profitFactor,
    maxDrawdown: maxDD,
    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
    bestDay,
    bestDayEur: bestDay ? byDay[bestDay] : null,
    worstDay,
    worstDayEur: worstDay ? byDay[worstDay] : null,
  };
}

export function plSessionBreakdown(withEur: UnifiedTrade[]) {
  const byS: Record<string, { eur: number; n: number; wins: number }> = {};
  TJ_SESSIONS.forEach((s) => {
    byS[s.name] = { eur: 0, n: 0, wins: 0 };
  });
  let counted = 0;
  withEur.forEach((t) => {
    if (!t.entryTime) return;
    counted++;
    const h = new Date(t.entryTime * 1000).getUTCHours();
    TJ_SESSIONS.forEach((s) => {
      if (tjIsSessionActive(s, h)) {
        byS[s.name].eur += t.eur ?? 0;
        byS[s.name].n += 1;
        if ((t.eur ?? 0) > 0) byS[s.name].wins += 1;
      }
    });
  });
  return { byS, counted };
}

export function plDayOfWeekBreakdown(withEur: UnifiedTrade[]) {
  const byDow = [0, 1, 2, 3, 4, 5, 6].map(() => ({
    eur: 0,
    n: 0,
    wins: 0,
  }));
  withEur.forEach((t) => {
    const dow = new Date(t.date + "T00:00:00").getDay();
    byDow[dow].eur += t.eur ?? 0;
    byDow[dow].n += 1;
    if ((t.eur ?? 0) > 0) byDow[dow].wins += 1;
  });
  return byDow;
}
