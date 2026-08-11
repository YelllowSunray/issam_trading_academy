import type { SessionDef } from "./types";

export const TJ_INSTRUMENTS = [
  "XAUUSD",
  "WTI/OIL",
  "US500",
  "BTCUSD",
  "Overig",
] as const;

export const TJ_SMC_TAGS = [
  "BOS",
  "CHoCH",
  "FVG",
  "Order Block",
  "Liquidity Sweep",
  "Fibonacci",
  "Elliott Wave",
  "Trendline",
] as const;

export const TJ_SESSIONS: SessionDef[] = [
  { name: "Sydney", start: 22, end: 7, color: "var(--blue)" },
  { name: "Tokyo", start: 0, end: 9, color: "var(--gold)" },
  { name: "London", start: 8, end: 17, color: "var(--bull)" },
  { name: "New York", start: 13, end: 22, color: "var(--bear)" },
];

export const MONTHS_NL = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

export const DOW_NL = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

/** EA default heartbeat is 60s; allow some slack before UI shows offline. */
export const HEARTBEAT_TIMEOUT_SECONDS = 150;
export const LEGACY_BUCKET = "onbekend";
