import type { UnifiedTrade } from "./types";

function esc(value: string | number | null | undefined) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function tradesToCsv(trades: UnifiedTrade[]) {
  const header = [
    "id",
    "source",
    "date",
    "instrument",
    "direction",
    "entry",
    "sl",
    "exit",
    "r",
    "eur",
    "volume",
    "tags",
    "notes",
  ];
  const rows = trades.map((t) =>
    [
      t.id,
      t.source,
      t.date,
      t.instrument,
      t.direction,
      t.entry,
      t.sl,
      t.exit,
      t.r != null ? t.r.toFixed(4) : "",
      t.eur != null ? t.eur.toFixed(2) : "",
      t.volume ?? "",
      (t.tags || []).join("|"),
      t.notes || "",
    ]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
