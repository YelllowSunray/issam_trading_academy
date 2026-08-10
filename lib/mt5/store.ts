import { trackUsage } from "@/lib/billing/meter";
import { HEARTBEAT_TIMEOUT_SECONDS, LEGACY_BUCKET } from "@/lib/journal/constants";
import type { Mt5AccountSummary, Mt5Status, Mt5Trade } from "@/lib/journal/types";
import { adminDb } from "@/lib/firebase/admin";
import { touchJournalActivity, userRef } from "@/lib/users/store";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

type AccountDoc = {
  info: Mt5Status["account"];
  last_heartbeat: string | null;
  last_trade_sync: string | null;
};

function accountsCol(uid: string) {
  return userRef(uid).collection("mt5_accounts");
}

function tradesCol(uid: string, login: string) {
  return accountsCol(uid).doc(login).collection("trades");
}

function emptyAccount(): AccountDoc {
  return { info: null, last_heartbeat: null, last_trade_sync: null };
}

function loginFrom(data: { login?: unknown }) {
  return data.login != null ? String(data.login) : LEGACY_BUCKET;
}

function isConnected(lastHeartbeat: string | null) {
  if (!lastHeartbeat) return false;
  const age = (Date.now() - new Date(lastHeartbeat).getTime()) / 1000;
  return age < HEARTBEAT_TIMEOUT_SECONDS;
}

async function migrateLegacyIfNeeded(uid: string, login: string) {
  if (login === LEGACY_BUCKET) return;
  const legacyRef = accountsCol(uid).doc(LEGACY_BUCKET);
  const targetRef = accountsCol(uid).doc(login);
  const [legacySnap, targetSnap] = await Promise.all([
    legacyRef.get(),
    targetRef.get(),
  ]);
  if (!legacySnap.exists || targetSnap.exists) return;

  const legacyData = legacySnap.data() as AccountDoc;
  await targetRef.set(legacyData);

  const legacyTrades = await tradesCol(uid, LEGACY_BUCKET).get();
  const batch = adminDb().batch();
  legacyTrades.docs.forEach((doc) => {
    batch.set(tradesCol(uid, login).doc(doc.id), doc.data());
    batch.delete(doc.ref);
  });
  batch.delete(legacyRef);
  await batch.commit();
}

async function ensureAccount(uid: string, login: string) {
  const ref = accountsCol(uid).doc(login);
  const snap = await ref.get();
  if (!snap.exists) await ref.set(emptyAccount());
  return ref;
}

export async function receiveTrade(
  uid: string,
  data: Mt5Trade & { login?: unknown },
) {
  if (!data?.id) throw new Error("ongeldige payload");
  const login = loginFrom(data);
  await migrateLegacyIfNeeded(uid, login);
  const accRef = await ensureAccount(uid, login);

  const newId = data.id;
  const posPart = newId.includes("-")
    ? newId.slice(newId.lastIndexOf("-") + 1)
    : newId;
  const legacyTradeId = `mt5-${posPart}`;
  const isNewFormat = newId !== legacyTradeId;

  if (isNewFormat) {
    const accounts = await accountsCol(uid).get();
    for (const acc of accounts.docs) {
      const otherLogin = acc.id;
      if (otherLogin === login && legacyTradeId === newId) continue;
      const legacyRef = tradesCol(uid, otherLogin).doc(legacyTradeId);
      const legacySnap = await legacyRef.get();
      if (legacySnap.exists) await legacyRef.delete();
    }
  }

  const syncedAt = new Date().toISOString();
  await tradesCol(uid, login)
    .doc(newId)
    .set({ ...data, login: data.login ?? login });
  await accRef.update({
    last_trade_sync: syncedAt,
  });
  await meter({ writes: 2, reads: 2 });
  await touchJournalActivity(uid, syncedAt);
}

export async function receiveHeartbeat(
  uid: string,
  data: Record<string, unknown>,
) {
  const login = loginFrom(data);
  await migrateLegacyIfNeeded(uid, login);
  const accRef = await ensureAccount(uid, login);
  await accRef.set(
    {
      info: data,
      last_heartbeat: new Date().toISOString(),
    },
    { merge: true },
  );
  await meter({ writes: 1, reads: 1 });
}

export async function listAccounts(uid: string): Promise<Mt5AccountSummary[]> {
  const snap = await accountsCol(uid).get();
  const out: Mt5AccountSummary[] = [];

  for (const doc of snap.docs) {
    const data = (doc.data() as AccountDoc) || emptyAccount();
    const tradesSnap = await tradesCol(uid, doc.id).count().get();
    const info = data.info || {};
    out.push({
      login: doc.id,
      balance: (info as { balance?: number }).balance ?? null,
      equity: (info as { equity?: number }).equity ?? null,
      currency: (info as { currency?: string }).currency ?? null,
      connected: isConnected(data.last_heartbeat),
      trade_count: tradesSnap.data().count,
      last_heartbeat: data.last_heartbeat,
    });
  }

  await meter({ reads: Math.max(1, snap.size) + snap.size });
  out.sort((a, b) => a.login.localeCompare(b.login));
  return out;
}

async function resolveLogin(uid: string, login?: string | null) {
  if (login) return login;
  const snap = await accountsCol(uid).orderBy("__name__").limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function listTrades(
  uid: string,
  login?: string | null,
): Promise<Mt5Trade[]> {
  const resolved = await resolveLogin(uid, login);
  if (!resolved) return [];
  const snap = await tradesCol(uid, resolved).get();
  await meter({ reads: Math.max(1, snap.size) });
  const trades = snap.docs.map((d) => d.data() as Mt5Trade);
  trades.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return trades;
}

export async function getStatus(
  uid: string,
  login?: string | null,
): Promise<Mt5Status> {
  const resolved = await resolveLogin(uid, login);
  if (!resolved) {
    await meter({ reads: 1 });
    return {
      connected: false,
      account: null,
      trade_count: 0,
      last_sync: null,
      last_heartbeat: null,
    };
  }
  const snap = await accountsCol(uid).doc(resolved).get();
  const data = (snap.data() as AccountDoc) || emptyAccount();
  const tradesSnap = await tradesCol(uid, resolved).count().get();
  await meter({ reads: 2 });
  return {
    connected: isConnected(data.last_heartbeat),
    account: data.info,
    trade_count: tradesSnap.data().count,
    last_sync: data.last_trade_sync,
    last_heartbeat: data.last_heartbeat,
  };
}

export async function seedAccountsFromStore(
  uid: string,
  raw: Record<string, unknown> | unknown[],
) {
  if (Array.isArray(raw)) {
    const login = LEGACY_BUCKET;
    await ensureAccount(uid, login);
    const batch = adminDb().batch();
    for (const item of raw) {
      const t = item as Mt5Trade;
      if (!t?.id) continue;
      batch.set(tradesCol(uid, login).doc(t.id), t);
    }
    await batch.commit();
    return;
  }

  for (const [login, accRaw] of Object.entries(raw)) {
    const acc = accRaw as {
      info?: AccountDoc["info"];
      last_heartbeat?: string | null;
      last_trade_sync?: string | null;
      trades?: Record<string, Mt5Trade>;
    };
    await accountsCol(uid)
      .doc(login)
      .set({
        info: acc.info ?? null,
        last_heartbeat: acc.last_heartbeat ?? null,
        last_trade_sync: acc.last_trade_sync ?? null,
      });
    const trades = acc.trades || {};
    const ids = Object.keys(trades);
    for (let i = 0; i < ids.length; i += 400) {
      const chunk = ids.slice(i, i + 400);
      const batch = adminDb().batch();
      chunk.forEach((id) => {
        batch.set(tradesCol(uid, login).doc(id), trades[id]);
      });
      await batch.commit();
    }
  }
}
