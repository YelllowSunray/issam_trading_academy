import { ApiError } from "@/lib/api/errors";
import { trackUsage } from "@/lib/billing/meter";
import { adminDb } from "@/lib/firebase/admin";
import { findUserByEmail, getUserProfile } from "@/lib/users/store";
import type { CloudAccountRecord, CloudAccountRow, VendorAccount } from "./types";

/** Academy user who owns the first MT5 journal — not the API2Trade login. */
const SEED_EMAIL =
  process.env.API2TRADE_SEED_EMAIL?.trim().toLowerCase() ||
  "ia.lieveldd@gmail.com";
/** Dashboard login at app.api2trade.com. Never used as a journal owner. */
const VENDOR_OWNER_EMAIL =
  process.env.API2TRADE_OWNER_EMAIL?.trim().toLowerCase() ||
  "cryptozayn@gmail.com";
const SEED_ACCOUNT_ID =
  process.env.API2TRADE_SEED_ACCOUNT_ID?.trim() ||
  "74c175c3-62f1-4de6-86dd-a010c1ec2ebc";
const SEED_LOGIN = process.env.API2TRADE_SEED_LOGIN?.trim() || "24615704";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

function col() {
  return adminDb().collection("api2trade_accounts");
}

export function seedConfig() {
  return {
    email: SEED_EMAIL,
    vendorOwnerEmail: VENDOR_OWNER_EMAIL,
    accountId: SEED_ACCOUNT_ID,
    login: SEED_LOGIN,
  };
}

export async function ensureSeedAccount(actorUid?: string | null) {
  const ref = col().doc(SEED_ACCOUNT_ID);
  const snap = await ref.get();
  const user = await findUserByEmail(SEED_EMAIL);
  const now = new Date().toISOString();

  if (!snap.exists) {
    const rec: CloudAccountRecord = {
      accountId: SEED_ACCOUNT_ID,
      uid: user?.uid || null,
      email: SEED_EMAIL,
      login: SEED_LOGIN,
      server: null,
      name: "Issam · eerste account",
      platform: "Metatrader 5",
      status: user ? "pending" : "pending",
      lastSyncAt: null,
      lastError: user ? null : "Issam moet eerst inloggen zodat we zijn uid kennen",
      lastTradeCount: 0,
      createdAt: now,
      createdBy: actorUid || null,
      source: "seed",
    };
    await ref.set(rec);
    await meter({ reads: 1, writes: 1 });
    return rec;
  }

  const existing = snap.data() as CloudAccountRecord;
  if ((!existing.uid || existing.email !== SEED_EMAIL) && user) {
    const next: CloudAccountRecord = {
      ...existing,
      uid: user.uid,
      email: SEED_EMAIL,
      login: existing.login || SEED_LOGIN,
    };
    await ref.set(
      { uid: next.uid, email: next.email, login: next.login },
      { merge: true },
    );
    await meter({ reads: 1, writes: 1 });
    return next;
  }
  await meter({ reads: 1 });
  return existing;
}

export async function listCloudAccounts(): Promise<CloudAccountRecord[]> {
  await ensureSeedAccount();
  const snap = await col().get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.docs
    .map((d) => d.data() as CloudAccountRecord)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

export async function listCloudAccountsForUid(uid: string) {
  const snap = await col().where("uid", "==", uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.docs.map((d) => d.data() as CloudAccountRecord);
}

export async function getCloudAccount(accountId: string) {
  const snap = await col().doc(accountId).get();
  await meter({ reads: 1 });
  return snap.exists ? (snap.data() as CloudAccountRecord) : null;
}

export async function upsertCloudAccount(
  rec: CloudAccountRecord,
): Promise<CloudAccountRecord> {
  await col().doc(rec.accountId).set(rec, { merge: true });
  await meter({ writes: 1 });
  return rec;
}

export async function updateCloudAccount(
  accountId: string,
  patch: Partial<CloudAccountRecord>,
) {
  await col().doc(accountId).set(patch, { merge: true });
  await meter({ writes: 1 });
}

export async function deleteCloudAccount(accountId: string) {
  await col().doc(accountId).delete();
  await meter({ deletes: 1 });
}

export async function resolveMember(email: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized && normalized === VENDOR_OWNER_EMAIL && normalized !== SEED_EMAIL) {
    throw new ApiError(
      "Dat is het API2Trade-loginsadres, niet een academy-gebruiker. Kies ia.lieveldd@gmail.com of het e-mailadres van de student in deze app.",
      400,
    );
  }
  const profile = await findUserByEmail(normalized);
  if (!profile) {
    throw new ApiError(
      "Geen gebruiker met dit e-mailadres. De student moet eerst inloggen.",
      404,
    );
  }
  return profile;
}

export async function toCloudRows(
  records: CloudAccountRecord[],
  vendor: VendorAccount[],
): Promise<CloudAccountRow[]> {
  const vendorIds = new Set(vendor.map((v) => v.id));
  return Promise.all(
    records.map(async (rec) => {
      const profile = rec.uid
        ? await getUserProfile(rec.uid)
        : await findUserByEmail(rec.email);
      return {
        ...rec,
        uid: rec.uid || profile?.uid || null,
        displayName: profile?.displayName || null,
        vendorConnected: vendorIds.has(rec.accountId),
      };
    }),
  );
}
