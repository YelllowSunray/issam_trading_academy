import type { AuthUser, MembershipStatus, UserProfile } from "@/lib/auth/types";
import type { BacktestEntry } from "@/lib/backtest/types";
import type { GoalItem } from "@/lib/goals/types";
import type { VipPlan, VipPlanId } from "@/lib/platform/plans";
import type {
  Course,
  CourseAsset,
  LessonProgress,
  PlatformSettings,
} from "@/lib/platform/types";
import type { TradeSignal } from "@/lib/signals/types";
import type { AdminOverview, MemberRow } from "@/lib/platform/types";
import type {
  AppSettings,
  ManualTrade,
  Mt5AccountSummary,
  Mt5Status,
  Mt5Trade,
  TradeAnnotation,
} from "./types";

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

export async function updateMe(patch: { displayName: string }) {
  return parseJson<AuthUser>(
    await fetch("/api/me", {
      method: "PATCH",
      headers: await authHeaders(true),
      body: JSON.stringify(patch),
    }),
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

export async function setAdminMembership(uid: string, membership: MembershipStatus) {
  return parseJson<{ ok: boolean; membership: MembershipStatus }>(
    await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: await authHeaders(true),
      body: JSON.stringify({ membership }),
    }),
  );
}

export async function fetchAdminOverview() {
  return parseJson<{
    overview: AdminOverview;
    members: MemberRow[];
    courses: Course[];
    settings: PlatformSettings;
  }>(await fetch("/api/admin/overview", { headers: await authHeaders() }));
}

export async function fetchPublicPricing() {
  return parseJson<{
    subscriberPriceLabel: string;
    coachingPriceNote: string;
    stripeEnabled: boolean;
    perks: string[];
    plans: Array<VipPlan & { available: boolean }>;
  }>(await fetch("/api/platform/public"));
}

export async function savePlatformSettings(patch: Partial<PlatformSettings>) {
  return parseJson<PlatformSettings>(
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: await authHeaders(true),
      body: JSON.stringify(patch),
    }),
  );
}

export async function fetchCourses() {
  return parseJson<Course[]>(
    await fetch("/api/courses", { headers: await authHeaders() }),
  );
}

export async function fetchCourse(id: string) {
  return parseJson<Course>(
    await fetch(`/api/courses/${id}`, { headers: await authHeaders() }),
  );
}

export async function uploadCourseAsset(
  kind: "pdf" | "video",
  file: File,
): Promise<CourseAsset> {
  const started = await parseJson<{
    path: string;
    name: string;
    contentType: string;
    uploadUrl?: string;
    url?: string;
  }>(
    await fetch("/api/admin/course-assets", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({
        kind,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    }),
  );
  if (started.uploadUrl) {
    const put = await fetch(started.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": started.contentType || file.type },
      body: file,
    });
    if (put.ok) {
      return {
        path: started.path,
        name: started.name || file.name,
        contentType: started.contentType || file.type,
        url: started.url,
      };
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error(
        "Directe upload geblokkeerd (storage CORS). Zet CORS op de Firebase-bucket of gebruik een kleiner bestand.",
      );
    }
  }
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file);
  return parseJson<CourseAsset>(
    await fetch("/api/admin/course-assets", {
      method: "POST",
      headers: await authHeaders(),
      body: form,
    }),
  );
}

export async function saveAdminCourse(course: Partial<Course> & { title: string }, id?: string) {
  if (id) {
    return parseJson<Course>(
      await fetch(`/api/admin/courses/${id}`, {
        method: "PUT",
        headers: await authHeaders(true),
        body: JSON.stringify(course),
      }),
    );
  }
  return parseJson<Course>(
    await fetch("/api/admin/courses", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify(course),
    }),
  );
}

export async function seedStarterCourse() {
  return parseJson<Course>(
    await fetch("/api/admin/courses", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({ seed: true }),
    }),
  );
}

export async function deleteAdminCourse(id: string) {
  return parseJson<{ ok: boolean }>(
    await fetch(`/api/admin/courses/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    }),
  );
}

export async function fetchProgress() {
  return parseJson<LessonProgress[]>(
    await fetch(withAsUser("/api/progress"), { headers: await authHeaders() }),
  );
}

export async function setProgress(courseId: string, lessonId: string, completed: boolean) {
  return parseJson<{ ok: boolean }>(
    await fetch(withAsUser("/api/progress"), {
      method: "PUT",
      headers: await authHeaders(true),
      body: JSON.stringify({ courseId, lessonId, completed }),
    }),
  );
}

export async function fetchCommunityInvite() {
  return parseJson<{
    label: string;
    note: string;
    url: string | null;
    tier: "vip" | "normal";
    linked: boolean;
    telegramUsername: string | null;
    publicChannel: string;
    botUsername: string | null;
    expiresAt: string | null;
  }>(
    await fetch(withAsUser("/api/community/invite"), {
      headers: await authHeaders(),
    }),
  );
}

export async function loginTelegram(payload: Record<string, unknown>) {
  return parseJson<{
    ok: boolean;
    telegramId: string;
    telegramUsername: string | null;
  }>(
    await fetch("/api/telegram/login", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify(payload),
    }),
  );
}

export async function confirmCheckout(sessionId: string) {
  return parseJson<{ ok: boolean; membership: string }>(
    await fetch("/api/stripe/confirm", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({ sessionId }),
    }),
  );
}

export async function startCheckout(planId?: VipPlanId | string) {
  return parseJson<{ url: string }>(
    await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({ planId }),
    }),
  );
}

export async function fetchDashboard() {
  return parseJson<{
    lastSignal: TradeSignal | null;
    academy: {
      completed: number;
      total: number;
      nextCourseId: string | null;
      nextCourseTitle: string | null;
    };
    community: {
      linked: boolean;
      telegramUsername: string | null;
      tier: "vip" | "normal";
      publicChannel: string;
    };
    pnl: {
      totalEur: number | null;
      tradeCount: number;
      lastDate: string | null;
    };
    goals: GoalItem[];
  }>(await fetch(withAsUser("/api/dashboard"), { headers: await authHeaders() }));
}

export async function fetchSignals() {
  return parseJson<{ signals: TradeSignal[]; disclaimer: string }>(
    await fetch("/api/signals", { headers: await authHeaders() }),
  );
}

export async function saveAdminSignal(body: Partial<TradeSignal> & {
  instrument: string;
  direction: TradeSignal["direction"];
  entry: string;
  sl: string;
}) {
  return parseJson<TradeSignal>(
    await fetch("/api/admin/signals", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteAdminSignal(id: string) {
  return parseJson<{ ok: boolean }>(
    await fetch("/api/admin/signals", {
      method: "DELETE",
      headers: await authHeaders(true),
      body: JSON.stringify({ id }),
    }),
  );
}

export async function fetchGoals() {
  return parseJson<{ goals: GoalItem[] }>(
    await fetch(withAsUser("/api/goals"), { headers: await authHeaders() }),
  );
}

export async function saveGoal(body: Partial<GoalItem> & { title?: string }) {
  return parseJson<GoalItem>(
    await fetch(withAsUser("/api/goals"), {
      method: "PUT",
      headers: await authHeaders(true),
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteGoal(id: string) {
  return parseJson<{ ok: boolean }>(
    await fetch(withAsUser("/api/goals"), {
      method: "DELETE",
      headers: await authHeaders(true),
      body: JSON.stringify({ id }),
    }),
  );
}

export async function fetchBacktests() {
  return parseJson<{ entries: BacktestEntry[] }>(
    await fetch(withAsUser("/api/backtests"), { headers: await authHeaders() }),
  );
}

export async function createBacktest(body: {
  date: string;
  instrument: string;
  direction: "Long" | "Short";
  thesis: string;
  resultR?: string;
  notes?: string;
}) {
  return parseJson<BacktestEntry>(
    await fetch(withAsUser("/api/backtests"), {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteBacktest(id: string) {
  return parseJson<{ ok: boolean }>(
    await fetch(withAsUser("/api/backtests"), {
      method: "DELETE",
      headers: await authHeaders(true),
      body: JSON.stringify({ id }),
    }),
  );
}

export async function openBillingPortal() {
  return parseJson<{ url: string }>(
    await fetch("/api/stripe/portal", {
      method: "POST",
      headers: await authHeaders(),
    }),
  );
}

export async function fetchMarketTickers() {
  return parseJson<{
    tickers: Array<{
      id: string;
      symbol: string;
      badge: string;
      price: number | null;
      change24h: number | null;
    }>;
    error?: string;
  }>(await fetch("/api/markets/tickers", { headers: await authHeaders() }));
}

export async function fetchCryptoMarkets() {
  return parseJson<{ coins: Array<{
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    price_change_percentage_24h: number;
  }>; error?: string }>(
    await fetch("/api/markets/crypto", { headers: await authHeaders() }),
  );
}

export async function fetchMarketNews() {
  return parseJson<{
    items: Array<{
      id: string;
      title: string;
      url: string;
      source: string;
      publishedAt: string | null;
      categories: string;
    }>;
    provider?: string;
    error?: string;
  }>(await fetch("/api/markets/news", { headers: await authHeaders() }));
}

export async function fetchDexTrending() {
  return parseJson<{
    coins: Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      chain: string;
      url: string;
      priceUsd: number | null;
      change1h: number | null;
      change6h: number | null;
      change24h: number | null;
      vol1h: number | null;
      vol6h: number | null;
      vol24h: number | null;
      liquidity: number | null;
      marketCap: number | null;
      featured?: boolean;
    }>;
    note?: string;
  }>(await fetch("/api/markets/dex-trending", { headers: await authHeaders() }));
}

export type DailyBrief = {
  date: string;
  body: string;
  createdAt: string;
  model: string;
  tradeCount?: number;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export async function fetchDailyBrief() {
  return parseJson<DailyBrief>(
    await fetch(withAsUser("/api/ai/daily"), { headers: await authHeaders() }),
  );
}

export async function regenerateDailyBrief() {
  return parseJson<DailyBrief>(
    await fetch(withAsUser("/api/ai/daily"), {
      method: "POST",
      headers: await authHeaders(true),
    }),
  );
}

export async function fetchAiChat() {
  return parseJson<{ messages: AiChatMessage[] }>(
    await fetch(withAsUser("/api/ai/chat"), { headers: await authHeaders() }),
  );
}

export async function sendAiChat(question: string) {
  return parseJson<AiChatMessage>(
    await fetch(withAsUser("/api/ai/chat"), {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({ question }),
    }),
  );
}

export async function fetchTradeDebrief(tradeId: string) {
  return parseJson<{ debrief: { body: string; createdAt: string } | null }>(
    await fetch(withAsUser(`/api/ai/debrief?tradeId=${encodeURIComponent(tradeId)}`), {
      headers: await authHeaders(),
    }),
  );
}

export async function createTradeDebrief(tradeId: string) {
  return parseJson<{ body: string; createdAt: string }>(
    await fetch(withAsUser("/api/ai/debrief"), {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({ tradeId }),
    }),
  );
}

export async function fetchAdminAiBrief(uid: string) {
  return parseJson<{ body: string; name: string }>(
    await fetch("/api/admin/ai/brief", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({ uid }),
    }),
  );
}

export async function searchDex(q: string) {
  return parseJson<{ pairs: Array<Record<string, unknown>>; error?: string }>(
    await fetch(`/api/markets/dex?q=${encodeURIComponent(q)}`, {
      headers: await authHeaders(),
    }),
  );
}

export async function fetchHyperliquid(wallet: string) {
  return parseJson<{ wallet: string; state: Record<string, unknown> }>(
    await fetch(`/api/markets/hyperliquid?wallet=${encodeURIComponent(wallet)}`, {
      headers: await authHeaders(),
    }),
  );
}

export type BillingLockInfo = {
  exceeded: boolean;
  budgetEur: number;
  title: string;
  studentMessage: string;
  adminMessage: string;
  ownerMessage?: string;
  ownerEmail?: string;
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

export type CloudAccountRow = {
  accountId: string;
  uid: string | null;
  email: string;
  displayName: string | null;
  login: string;
  server: string | null;
  name: string | null;
  platform: string;
  status: "active" | "error" | "disconnected" | "pending";
  lastSyncAt: string | null;
  lastError: string | null;
  lastTradeCount: number;
  createdAt: string;
  source: "seed" | "register" | "map";
  vendorConnected: boolean;
};

export type CloudSyncResult = {
  accountId: string;
  email: string;
  login: string;
  ok: boolean;
  connected: boolean;
  written: number;
  tradeCount: number;
  error: string | null;
};

export type CloudAccountsPayload = {
  configured: boolean;
  seed: {
    email: string;
    vendorOwnerEmail: string;
    accountId: string;
    login: string;
  };
  vendor: Array<{
    id: string;
    accountNumber: string | null;
    accountServer: string | null;
    type: string | null;
    name: string | null;
  }>;
  vendorError: string | null;
  accounts: CloudAccountRow[];
};

export async function fetchAdminCloudAccounts() {
  return parseJson<CloudAccountsPayload>(
    await fetch("/api/admin/cloud-accounts", { headers: await authHeaders() }),
  );
}

export async function addAdminCloudAccount(body: {
  mode: "register" | "map";
  email: string;
  login?: string;
  password?: string;
  server?: string;
  name?: string;
  platform?: "Metatrader 5" | "Metatrader 4";
  accountId?: string;
}) {
  return parseJson<{ ok: boolean; result: CloudSyncResult }>(
    await fetch("/api/admin/cloud-accounts", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify(body),
    }),
  );
}

export async function syncAdminCloudAccounts(accountId?: string) {
  return parseJson<{ ok: boolean; results: CloudSyncResult[] }>(
    await fetch("/api/admin/cloud-accounts/sync", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify(accountId ? { accountId } : {}),
    }),
  );
}

export async function unlinkAdminCloudAccount(
  accountId: string,
  deleteVendor = false,
) {
  const q = deleteVendor ? "?vendor=1" : "";
  return parseJson<{ ok: boolean }>(
    await fetch(`/api/admin/cloud-accounts/${accountId}${q}`, {
      method: "DELETE",
      headers: await authHeaders(),
    }),
  );
}

export async function fetchMyCloudSync() {
  return parseJson<{
    accounts: Array<{
      accountId: string;
      login: string;
      server: string | null;
      name: string | null;
      status: string;
      lastSyncAt: string | null;
      lastError: string | null;
    }>;
  }>(await fetch("/api/cloud-sync", { headers: await authHeaders() }));
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
