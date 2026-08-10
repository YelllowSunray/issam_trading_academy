import type {
  AppSettings,
  ManualTrade,
  Mt5AccountSummary,
  Mt5Status,
  Mt5Trade,
  TradeAnnotation,
} from "./types";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

export async function fetchAccounts() {
  return parseJson<Mt5AccountSummary[]>(await fetch("/api/accounts"));
}

export async function fetchStatus(login?: string | null) {
  const q = login ? `?login=${encodeURIComponent(login)}` : "";
  return parseJson<Mt5Status>(await fetch(`/api/status${q}`));
}

export async function fetchMt5Trades(login?: string | null) {
  const q = login ? `?login=${encodeURIComponent(login)}` : "";
  return parseJson<Mt5Trade[]>(await fetch(`/api/trades${q}`));
}

export async function fetchManualTrades() {
  return parseJson<ManualTrade[]>(await fetch("/api/manual-trades"));
}

export async function createManualTrade(
  trade: Omit<ManualTrade, "id" | "createdAt">,
) {
  return parseJson<ManualTrade>(
    await fetch("/api/manual-trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    }),
  );
}

export async function deleteManualTrade(id: string) {
  return parseJson<{ ok: boolean }>(
    await fetch(`/api/manual-trades/${id}`, { method: "DELETE" }),
  );
}

export async function fetchAnnotations() {
  return parseJson<Record<string, TradeAnnotation>>(
    await fetch("/api/annotations"),
  );
}

export async function saveAnnotation(tradeId: string, ann: TradeAnnotation) {
  return parseJson<TradeAnnotation>(
    await fetch(`/api/annotations/${tradeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ann),
    }),
  );
}

export async function fetchSettings() {
  return parseJson<AppSettings>(await fetch("/api/settings"));
}

export async function saveSettings(patch: Partial<AppSettings>) {
  return parseJson<AppSettings>(
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function uploadImage(dataUrl: string) {
  return parseJson<{ imageUrl: string }>(
    await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    }),
  );
}
