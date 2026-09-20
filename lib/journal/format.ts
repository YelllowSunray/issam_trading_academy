import { dateLocale } from "@/lib/i18n";

export function fmtEur(n: number) {
  const sign = n >= 0 ? "+" : "-";
  return (
    sign +
    "€" +
    Math.abs(n).toLocaleString(dateLocale(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

export function fmtEurAbs(n: number) {
  return (
    "€" +
    Math.abs(n).toLocaleString(dateLocale(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

export function tjFmtDateTime(unixSec?: number | null) {
  if (!unixSec) return "—";
  const d = new Date(unixSec * 1000);
  return d.toLocaleString(dateLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function tjFmtPrice(n: string | number | null | undefined) {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "number" ? n : parseFloat(n);
  if (Number.isNaN(num)) return "—";
  return String(num);
}

export function plMonthLabel(dateStr: string, monthsNl: string[]) {
  const d = new Date(dateStr + "T00:00:00");
  return monthsNl[d.getMonth()] + " '" + String(d.getFullYear()).slice(2);
}

export function plMonthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export function labelInstrument(name: string, otherLabel: string) {
  return name === "Overig" ? otherLabel : name;
}
