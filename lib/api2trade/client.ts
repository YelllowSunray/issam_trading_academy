import { ApiError } from "@/lib/api/errors";
import type { Api2TradeSummary, VendorAccount } from "./types";

const DEFAULT_BASE = "https://api.api2trade.com";

export function api2tradeConfigured() {
  return Boolean(process.env.API2TRADE_API_KEY?.trim());
}

function baseUrl() {
  return (process.env.API2TRADE_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

function apiKey() {
  const key = process.env.API2TRADE_API_KEY?.trim();
  if (!key) {
    throw new ApiError("API2Trade is niet geconfigureerd (API2TRADE_API_KEY)", 500);
  }
  return key;
}

function extractError(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const rec = body as Record<string, unknown>;
  for (const key of ["error", "message", "Message", "detail"]) {
    const val = rec[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return fallback;
}

async function a2tFetch<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${baseUrl()}${path}`);
  for (const [key, value] of Object.entries(init.query || {})) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const { query: _unusedQuery, ...rest } = init;
  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey(),
      ...(rest.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text ? { message: text } : null;
  }

  if (!res.ok) {
    const msg = extractError(json, `API2Trade ${res.status}`);
    const status = res.status === 402 ? 402 : res.status === 401 ? 502 : 400;
    throw new ApiError(msg, status);
  }
  return json as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function getVendorAccounts(): Promise<VendorAccount[]> {
  const raw = await a2tFetch<unknown>("/GetAccounts");
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.accounts)
      ? (asRecord(raw)!.accounts as unknown[])
      : [];
  return list.map((item) => {
    const rec = asRecord(item) || {};
    return {
      id: str(rec.id) || "",
      accountNumber: str(rec.account_number ?? rec.accountNumber ?? rec.user ?? rec.login),
      accountServer: str(rec.account_server ?? rec.accountServer ?? rec.server),
      type: str(rec.type),
      name: str(rec.name),
    };
  }).filter((a) => a.id);
}

export async function checkConnect(accountId: string) {
  try {
    await a2tFetch("/CheckConnect", { query: { id: accountId } });
    return true;
  } catch {
    return false;
  }
}

export async function getAccountSummary(accountId: string): Promise<Api2TradeSummary> {
  const summary = await a2tFetch<unknown>("/AccountSummary", { query: { id: accountId } });
  const s = asRecord(summary) || {};
  let login: string | null = str(s.login ?? s.user);
  let server: string | null = str(s.server ?? s.serverName);
  let name: string | null = str(s.name ?? s.accountName);
  if (!login || !server) {
    const vendor = await getVendorAccounts().catch(() => []);
    const match = vendor.find((v) => v.id === accountId);
    login = login || match?.accountNumber || null;
    server = server || match?.accountServer || null;
    name = name || match?.name || null;
  }
  return {
    balance: num(s.balance),
    equity: num(s.equity),
    currency: str(s.currency),
    login,
    name,
    server,
  };
}

export type HistoryOrder = Record<string, unknown>;

function historyList(raw: unknown): HistoryOrder[] {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object") as HistoryOrder[];
  const rec = asRecord(raw);
  if (!rec) return [];
  for (const key of ["data", "orders", "items", "history"]) {
    if (Array.isArray(rec[key])) return rec[key] as HistoryOrder[];
  }
  return [];
}

export async function getOrderHistory(
  accountId: string,
  fromIso: string,
  toIso: string,
): Promise<HistoryOrder[]> {
  const from = fromIso.replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
  const to = toIso.replace(/\.\d{3}Z$/, "").replace(/Z$/, "");

  const raw = await a2tFetch<unknown>("/OrderHistory", {
    query: { id: accountId, from, to, dateFrom: from, dateTo: to },
  });
  const full = historyList(raw);
  if (full.length) return full;

  const first = await a2tFetch<unknown>("/OrderHistoryPagination", {
    query: {
      id: accountId,
      from,
      to,
      ordersPerPage: 100,
      pageNumber: 0,
      requestAgain: true,
      ignoreDepositWithdraw: true,
      sort: "CloseTime",
    },
  });
  return historyList(first);
}

export async function registerAccount(input: {
  login: string;
  password: string;
  server: string;
  name?: string;
  platform?: "Metatrader 5" | "Metatrader 4";
}): Promise<{ id: string }> {
  const type = input.platform || "Metatrader 5";
  const name = input.name || `${input.login}`;

  try {
    const viaGet = await a2tFetch<unknown>("/RegisterAccount", {
      query: {
        type,
        server: input.server,
        user: input.login,
        password: input.password,
        name,
      },
    });
    const id = str(asRecord(viaGet)?.id);
    if (id) return { id };
  } catch (err) {
    if (err instanceof ApiError && err.status === 402) throw err;
  }

  const viaPost = await a2tFetch<unknown>("/RegisterAccount", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: input.login,
      password: input.password,
      server: input.server,
      name,
      type,
    }),
  });
  const id = str(asRecord(viaPost)?.id);
  if (!id) throw new ApiError("API2Trade gaf geen account-UUID terug", 502);
  return { id };
}

export async function deleteVendorAccount(accountId: string) {
  try {
    await a2tFetch("/DeleteAccount", { query: { id: accountId } });
    return;
  } catch {
    await a2tFetch("/DeleteAccount", { method: "DELETE", query: { id: accountId } });
  }
}
