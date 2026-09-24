import { ApiError } from "@/lib/api/errors";
import { tRequest } from "@/lib/i18n/server";
import {
  listOpenTrades,
  receiveHeartbeat,
  receiveTradesBatch,
} from "@/lib/mt5/store";
import { findUserByEmail } from "@/lib/users/store";
import {
  checkConnect,
  getAccountSummary,
  getOpenPositions,
  getOrderHistory,
  getVendorAccounts,
  registerAccount,
} from "./client";
import { mapHistoryToTrades, mapOpenedToTrades } from "./map";
import {
  deleteCloudAccount,
  ensureSeedAccount,
  getCloudAccount,
  listCloudAccounts,
  listCloudAccountsForUid,
  resolveMember,
  updateCloudAccount,
  upsertCloudAccount,
} from "./store";
import type { CloudAccountRecord, CloudSyncResult } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_SYNC_LOOKBACK_MS = 10 * 365 * DAY_MS;
const INCREMENTAL_OVERLAP_MS = 2 * DAY_MS;
const MIN_INCREMENTAL_MS = 21 * DAY_MS;
const STALE_SYNC_LOOKBACK_MS = 400 * DAY_MS;

function isoNoMs(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function resolveUid(rec: CloudAccountRecord) {
  if (rec.uid) return rec.uid;
  const user = await findUserByEmail(rec.email);
  if (!user) return null;
  await updateCloudAccount(rec.accountId, { uid: user.uid, email: user.email });
  return user.uid;
}

export async function syncCloudAccount(
  accountId: string,
): Promise<CloudSyncResult> {
  let target = await getCloudAccount(accountId);
  if (!target) {
    const seed = await ensureSeedAccount();
    target = seed.accountId === accountId ? seed : null;
  }
  if (!target) throw new ApiError(await tRequest("api.cloudAccountNotFound"), 404);

  const uid = await resolveUid(target);
  if (!uid) {
    const error = await tRequest("api.noLoginCannotSync", { email: target.email });
    await updateCloudAccount(target.accountId, { status: "error", lastError: error });
    return {
      accountId: target.accountId,
      email: target.email,
      login: target.login,
      ok: false,
      connected: false,
      written: 0,
      tradeCount: 0,
      error,
    };
  }

  try {
    await checkConnect(target.accountId);
    const summary = await getAccountSummary(target.accountId);
    const login = summary.login || target.login;
    if (!login) throw new ApiError(await tRequest("api.noMt5Login"), 502);

    const from = new Date(
      target.lastSyncAt
        ? Math.max(
            Math.min(
              Date.parse(target.lastSyncAt) - INCREMENTAL_OVERLAP_MS,
              Date.now() - MIN_INCREMENTAL_MS,
            ),
            Date.now() - STALE_SYNC_LOOKBACK_MS,
          )
        : Date.now() - FIRST_SYNC_LOOKBACK_MS,
    );
    // API2Trade filters OrderHistory on broker-local close times, which can
    // sit hours ahead of UTC. A `to=now` window then drops today's closes.
    const to = new Date(Date.now() + 36 * 60 * 60 * 1000);
    const [history, openedResult] = await Promise.all([
      getOrderHistory(target.accountId, isoNoMs(from), isoNoMs(to)),
      getOpenPositions(target.accountId),
    ]);
    const opened = openedResult.orders;
    const closed = mapHistoryToTrades(history, login);
    const live = mapOpenedToTrades(opened, login);
    const seen = new Set(closed.map((t) => t.id));
    const trades = [...closed, ...live.filter((t) => !seen.has(t.id))];
    let batch = await receiveTradesBatch(uid, login, trades);

    let sweptGhosts = false;
    const windowAlreadyWide =
      Date.now() - from.getTime() >= STALE_SYNC_LOOKBACK_MS - DAY_MS;
    const lastSweep = target.lastGhostSweepAt
      ? Date.parse(target.lastGhostSweepAt)
      : 0;
    const sweepDue = !lastSweep || Date.now() - lastSweep > 12 * 60 * 60 * 1000;
    if (openedResult.fetched && !windowAlreadyWide && sweepDue) {
      const liveIds = new Set(live.map((t) => t.id));
      const ghosts = (await listOpenTrades(uid, login)).filter(
        (t) => t.id && !liveIds.has(t.id),
      );
      if (ghosts.length) {
        const extraHist = await getOrderHistory(
          target.accountId,
          isoNoMs(new Date(Date.now() - STALE_SYNC_LOOKBACK_MS)),
          isoNoMs(to),
        );
        const ghostIds = new Set(ghosts.map((t) => t.id));
        const extraClosed = mapHistoryToTrades(extraHist, login).filter(
          (t) => ghostIds.has(t.id) && (t.exit != null || t.exitTime != null),
        );
        if (extraClosed.length) {
          batch = await receiveTradesBatch(uid, login, extraClosed);
        }
        sweptGhosts = true;
      }
    }
    await receiveHeartbeat(uid, {
      login,
      name: summary.name || target.name,
      server: summary.server || target.server,
      balance: summary.balance,
      equity: summary.equity,
      currency: summary.currency,
      source: "api2trade",
    });

    const now = new Date().toISOString();
    await updateCloudAccount(target.accountId, {
      uid,
      login,
      server: summary.server || target.server,
      name: summary.name || target.name,
      status: "active",
      lastSyncAt: now,
      lastError: null,
      lastTradeCount: batch.tradeCount,
      ...(sweptGhosts ? { lastGhostSweepAt: now } : {}),
    });

    return {
      accountId: target.accountId,
      email: target.email,
      login,
      ok: true,
      connected: true,
      written: batch.written,
      tradeCount: batch.tradeCount,
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : await tRequest("api.syncFailed");
    await updateCloudAccount(target.accountId, {
      status: "error",
      lastError: error,
    });
    return {
      accountId: target.accountId,
      email: target.email,
      login: target.login,
      ok: false,
      connected: false,
      written: 0,
      tradeCount: target.lastTradeCount || 0,
      error,
    };
  }
}

export async function syncAllCloudAccounts(): Promise<CloudSyncResult[]> {
  await ensureSeedAccount();
  const accounts = await listCloudAccounts();
  const results: CloudSyncResult[] = [];
  for (const acc of accounts) {
    results.push(await syncCloudAccount(acc.accountId));
  }
  return results;
}

export async function mapExistingAccount(input: {
  email: string;
  accountId: string;
  login?: string;
  actorUid: string;
}) {
  const profile = await resolveMember(input.email);
  const accountId = input.accountId.trim();
  if (!accountId) throw new ApiError(await tRequest("api.uuidRequired"), 400);

  const vendor = await getVendorAccounts();
  const match = vendor.find((v) => v.id === accountId);
  const login = (input.login || match?.accountNumber || "").trim();
  if (!login) {
    throw new ApiError(await tRequest("api.mt5LoginMissing"), 400);
  }

  const now = new Date().toISOString();
  const rec: CloudAccountRecord = {
    accountId,
    uid: profile.uid,
    email: profile.email,
    login,
    server: match?.accountServer || null,
    name: match?.name || null,
    platform: match?.type || "Metatrader 5",
    status: "pending",
    lastSyncAt: null,
    lastError: null,
    lastTradeCount: 0,
    createdAt: now,
    createdBy: input.actorUid,
    source: "map",
  };
  await upsertCloudAccount(rec);
  return syncCloudAccount(accountId);
}

export async function registerStudentAccount(input: {
  email: string;
  login: string;
  password: string;
  server: string;
  name?: string;
  platform?: "Metatrader 5" | "Metatrader 4";
  actorUid: string;
}) {
  const profile = await resolveMember(input.email);
  const login = input.login.trim();
  const server = input.server.trim();
  const password = input.password;
  if (!login || !server || !password) {
    throw new ApiError(await tRequest("api.loginServerPasswordRequired"), 400);
  }
  const already = (await listCloudAccountsForUid(profile.uid)).some(
    (account) => account.login === login,
  );
  if (already) {
    throw new ApiError(await tRequest("api.mt5AlreadyLinked"), 409);
  }

  const created = await registerAccount({
    login,
    password,
    server,
    name: input.name?.trim() || `${profile.displayName} ${login}`,
    platform: input.platform,
  });

  const now = new Date().toISOString();
  await upsertCloudAccount({
    accountId: created.id,
    uid: profile.uid,
    email: profile.email,
    login,
    server,
    name: input.name?.trim() || null,
    platform: input.platform || "Metatrader 5",
    status: "pending",
    lastSyncAt: null,
    lastError: null,
    lastTradeCount: 0,
    createdAt: now,
    createdBy: input.actorUid,
    source: "register",
  });
  return syncCloudAccount(created.id);
}

export async function unlinkCloudAccount(
  accountId: string,
  opts: { deleteVendor?: boolean } = {},
) {
  const rec = await getCloudAccount(accountId);
  if (!rec) throw new ApiError(await tRequest("api.cloudAccountNotFound"), 404);
  if (opts.deleteVendor) {
    const { deleteVendorAccount } = await import("./client");
    await deleteVendorAccount(accountId);
  }
  await deleteCloudAccount(accountId);
  return rec;
}
