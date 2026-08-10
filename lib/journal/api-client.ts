import type { AuthUser } from "@/lib/auth/types";
import type {
  AppSettings,
  ManualTrade,
  Mt5AccountSummary,
  Mt5Status,
  Mt5Trade,
  TradeAnnotation,
} from "./types";
import type { UserProfile } from "@/lib/auth/types";

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter = async () => null;
let asUserOverride: string | null = null;

export function setAuthTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

export function setAsUserOverride(uid: string | null) {
  asUserOverride = uid;
}

async function authHeaders(json = false): Promise<HeadersInit> {
  const token = await tokenGetter();
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function withAsUser(path: string) {
  if (!asUserOverride) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}asUser=${encodeURIComponent(asUserOverride)}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

export async function fetchMe() {
  return parseJson<AuthUser>(
    await fetch("/api/me", { headers: await authHeaders() }),
  );
}

export async function fetchAccounts() {
  return parseJson<Mt5AccountSummary[]>(
    await fetch(withAsUser("/api/accounts"), { headers: await authHeaders() }),
  );
}

export async function fetchStatus(login?: string | null) {
  const q = login ? `?login=${encodeURIComponent(login)}` : "";
  return parseJson<Mt5Status>(
    await fetch(withAsUser(`/api/status${q}`), {
      headers: await authHeaders(),
    }),
  );
}

export async function fetchMt5Trades(login?: string | null) {
  const q = login ? `?login=${encodeURIComponent(login)}` : "";
  return parseJson<Mt5Trade[]>(
    await fetch(withAsUser(`/api/trades${q}`), {
      headers: await authHeaders(),
    }),
  );
}

export async function fetchManualTrades() {
  return parseJson<ManualTrade[]>(
    await fetch(withAsUser("/api/manual-trades"), {
      headers: await authHeaders(),
    }),
  );
}

export async function createManualTrade(
  trade: Omit<ManualTrade, "id" | "createdAt">,
) {
  return parseJson<ManualTrade>(
    await fetch("/api/manual-trades", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify(trade),
    }),
  );
}

export async function deleteManualTrade(id: string) {
  return parseJson<{ ok: boolean }>(
    await fetch(`/api/manual-trades/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    }),
  );
}

export async function fetchAnnotations() {
  return parseJson<Record<string, TradeAnnotation>>(
    await fetch(withAsUser("/api/annotations"), {
      headers: await authHeaders(),
    }),
  );
}

export async function saveAnnotation(tradeId: string, ann: TradeAnnotation) {
  return parseJson<TradeAnnotation>(
    await fetch(`/api/annotations/${tradeId}`, {
      method: "PUT",
      headers: await authHeaders(true),
      body: JSON.stringify(ann),
    }),
  );
}

export async function fetchSettings() {
  return parseJson<AppSettings>(
    await fetch(withAsUser("/api/settings"), {
      headers: await authHeaders(),
    }),
  );
}

export async function saveSettings(patch: Partial<AppSettings>) {
  return parseJson<AppSettings>(
    await fetch("/api/settings", {
      method: "PUT",
      headers: await authHeaders(true),
      body: JSON.stringify(patch),
    }),
  );
}

export async function uploadImage(dataUrl: string) {
  return parseJson<{ imageUrl: string }>(
    await fetch("/api/uploads", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({ dataUrl }),
    }),
  );
}

export async function fetchMt5SecretMeta() {
  return parseJson<{ configured: boolean; createdAt: string | null }>(
    await fetch("/api/mt5-secret", { headers: await authHeaders() }),
  );
}

export async function rotateMt5Secret() {
  return parseJson<{ secret: string; createdAt: string; configured: boolean }>(
    await fetch("/api/mt5-secret", {
      method: "POST",
      headers: await authHeaders(),
    }),
  );
}

export async function fetchAdminUsers() {
  return parseJson<UserProfile[]>(
    await fetch("/api/admin/users", { headers: await authHeaders() }),
  );
}

export async function setAdminUserDisabled(uid: string, disabled: boolean) {
  return parseJson<{ ok: boolean }>(
    await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: await authHeaders(true),
      body: JSON.stringify({ disabled }),
    }),
  );
}

export type BillingLockInfo = {
  exceeded: boolean;
  budgetEur: number;
  title: string;
  studentMessage: string;
  adminMessage: string;
  contactName: string;
  contactEmail: string;
  whatsappE164: string | null;
  whatsappUrl: string | null;
  usage: {
    period: string;
    estimatedCostEur: number;
    percentUsed: number;
    reads: number;
    writes: number;
    deletes: number;
    uploadBytes: number;
  } | null;
};

export async function fetchBillingStatus() {
  return parseJson<BillingLockInfo>(
    await fetch("/api/billing", { headers: await authHeaders() }),
  );
}

export async function setBillingExceeded(exceeded: boolean, reason?: string) {
  return parseJson<BillingLockInfo>(
    await fetch("/api/billing", {
      method: "PATCH",
      headers: await authHeaders(true),
      body: JSON.stringify({ exceeded, reason }),
    }),
  );
}
