import { ApiError } from "@/lib/api/errors";
import { receiveHeartbeat, receiveTradesBatch } from "@/lib/mt5/store";
import { findUserByEmail } from "@/lib/users/store";
import {
  checkConnect,
  getAccountSummary,
  getOrderHistory,
  getVendorAccounts,
  registerAccount,
} from "./client";
import { mapHistoryToTrades } from "./map";
import {
  deleteCloudAccount,
  ensureSeedAccount,
  getCloudAccount,
  listCloudAccounts,
  resolveMember,
  updateCloudAccount,
  upsertCloudAccount,
} from "./store";
import type { CloudAccountRecord, CloudSyncResult } from "./types";

const LOOKBACK_MS = 120 * 24 * 60 * 60 * 1000;

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
  if (!target) throw new ApiError("cloud-account niet gevonden", 404);

  const uid = await resolveUid(target);
  if (!uid) {
    const error = `${target.email} heeft nog geen login — kan niet syncen`;
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
    if (!login) throw new ApiError("API2Trade gaf geen MT5-login terug", 502);

    const from = new Date(
      target.lastSyncAt
        ? Math.max(
            Date.parse(target.lastSyncAt) - 2 * 24 * 60 * 60 * 1000,
            Date.now() - LOOKBACK_MS,
          )
        : Date.now() - LOOKBACK_MS,
    );
    const history = await getOrderHistory(
      target.accountId,
      isoNoMs(from),
      isoNoMs(new Date()),
    );
    const trades = mapHistoryToTrades(history, login);
    const batch = await receiveTradesBatch(uid, login, trades);
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
    const error = err instanceof Error ? err.message : "sync mislukt";
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
  if (!accountId) throw new ApiError("UUID verplicht", 400);

  const vendor = await getVendorAccounts();
  const match = vendor.find((v) => v.id === accountId);
  const login = (input.login || match?.accountNumber || "").trim();
  if (!login) {
    throw new ApiError("MT5-login ontbreekt — vul het accountnummer in", 400);
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
    throw new ApiError("login, server en wachtwoord zijn verplicht", 400);
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
  if (!rec) throw new ApiError("cloud-account niet gevonden", 404);
  if (opts.deleteVendor) {
    const { deleteVendorAccount } = await import("./client");
    await deleteVendorAccount(accountId);
  }
  await deleteCloudAccount(accountId);
  return rec;
}
