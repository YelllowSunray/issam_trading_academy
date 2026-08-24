import { ApiError } from "@/lib/api/errors";
import { trackUsage } from "@/lib/billing/meter";
import { adminDb } from "@/lib/firebase/admin";
import { hashIngestSecret, secretsEqual } from "@/lib/auth/secrets";
import {
  hasPlatformAccess,
  normalizeMembership,
} from "@/lib/auth/membership";
import type {
  AuthUser,
  MembershipStatus,
  UserProfile,
  UserRole,
} from "@/lib/auth/types";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

function usersCol() {
  return adminDb().collection("users");
}

function ingestLookupCol() {
  return adminDb().collection("mt5_ingest_secrets");
}

type IngestCacheEntry = { uid: string | null; at: number };
const ingestUidCache = new Map<string, IngestCacheEntry>();
const INGEST_CACHE_MS = 10 * 60_000;

function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function userRef(uid: string) {
  return usersCol().doc(uid);
}

export async function ensureUserProfile(input: {
  uid: string;
  email: string;
  displayName?: string | null;
}): Promise<UserProfile> {
  const ref = userRef(input.uid);
  const snap = await ref.get();
  const now = new Date().toISOString();
  const email = (input.email || "").toLowerCase();
  const isAdmin = adminEmails().has(email);

  if (!snap.exists) {
    const profile: UserProfile = {
      uid: input.uid,
      email,
      displayName: input.displayName || email.split("@")[0] || "Trader",
      role: isAdmin ? "admin" : "student",
      membership: isAdmin ? "coaching_free" : "none",
      disabled: false,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };
    await ref.set(profile);
    await meter({ reads: 1, writes: 1 });
    return profile;
  }

  const existing = snap.data() as UserProfile;
  const role: UserRole =
    existing.role === "admin" || isAdmin ? "admin" : "student";
  const membership = existing.membership
    ? existing.membership
    : normalizeMembership({ ...existing, role });
  const seenStale =
    !existing.lastSeenAt ||
    Date.now() - new Date(existing.lastSeenAt).getTime() > 15 * 60_000;
  const next: UserProfile = {
    ...existing,
    email: email || existing.email,
    displayName: input.displayName || existing.displayName,
    role,
    membership,
    updatedAt: now,
    lastSeenAt: seenStale ? now : existing.lastSeenAt || now,
  };
  await ref.set(next, { merge: true });
  await meter({ reads: 1, writes: 1 });
  return next;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await userRef(uid).get();
  await meter({ reads: 1 });
  if (!snap.exists) return null;
  return snap.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  patch: { displayName?: string },
): Promise<UserProfile> {
  const existing = await getUserProfile(uid);
  if (!existing) {
    throw new ApiError("user not found", 404);
  }

  const displayName =
    typeof patch.displayName === "string"
      ? patch.displayName.trim()
      : existing.displayName;

  if (!displayName || displayName.length < 2) {
    throw new ApiError("Naam moet minstens 2 tekens zijn", 400);
  }

  const next: UserProfile = {
    ...existing,
    displayName,
    updatedAt: new Date().toISOString(),
  };
  await userRef(uid).set(
    { displayName: next.displayName, updatedAt: next.updatedAt },
    { merge: true },
  );
  await meter({ writes: 1 });
  return next;
}

export async function listUsers(): Promise<UserProfile[]> {
  const snap = await usersCol().get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.docs
    .map((d) => {
      const data = d.data() as UserProfile;
      return { ...data, membership: normalizeMembership(data) };
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function setUserDisabled(uid: string, disabled: boolean) {
  await userRef(uid).set(
    { disabled, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  await meter({ writes: 1 });
}

export async function touchJournalActivity(
  uid: string,
  at: string = new Date().toISOString(),
) {
  await userRef(uid).set(
    { lastJournalActivityAt: at, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  await meter({ writes: 1 });
}

/** Best-effort peek when lastJournalActivityAt was never written. */
async function peekJournalActivity(uid: string): Promise<string | null> {
  const times: string[] = [];
  const [manuals, accounts, annotations] = await Promise.all([
    userRef(uid).collection("manual_trades").get(),
    userRef(uid).collection("mt5_accounts").get(),
    userRef(uid).collection("annotations").get(),
  ]);
  await meter({
    reads: Math.max(1, manuals.size + accounts.size + annotations.size),
  });

  manuals.docs.forEach((d) => {
    const createdAt = (d.data() as { createdAt?: string }).createdAt;
    if (createdAt) times.push(createdAt);
  });
  accounts.docs.forEach((d) => {
    const data = d.data() as {
      last_trade_sync?: string | null;
    };
    if (data.last_trade_sync) times.push(data.last_trade_sync);
  });
  annotations.docs.forEach((d) => {
    const t = d.updateTime?.toDate()?.toISOString();
    if (t) times.push(t);
  });

  if (!times.length) return null;
  times.sort();
  return times[times.length - 1] || null;
}

export async function listCoachStudents(): Promise<UserProfile[]> {
  const users = await listUsers();
  const enriched = await Promise.all(
    users.map(async (u) => {
      if (u.lastJournalActivityAt) return u;
      const peeked = await peekJournalActivity(u.uid);
      if (peeked) {
        // Backfill so later lists stay cheap
        await userRef(u.uid).set(
          { lastJournalActivityAt: peeked },
          { merge: true },
        );
        await meter({ writes: 1 });
        return { ...u, lastJournalActivityAt: peeked };
      }
      return { ...u, lastJournalActivityAt: null };
    }),
  );

  return enriched.sort((a, b) => {
    const aT = a.lastJournalActivityAt || "";
    const bT = b.lastJournalActivityAt || "";
    if (aT !== bT) return bT.localeCompare(aT);
    return (a.displayName || "").localeCompare(b.displayName || "", "nl");
  });
}

export async function setUserMembership(
  uid: string,
  membership: MembershipStatus,
  actorUid?: string,
) {
  const existing = await getUserProfile(uid);
  if (!existing) {
    throw new ApiError("user not found", 404);
  }
  if (existing.role === "admin" && membership !== "coaching_free") {
    throw new ApiError("admins houden altijd toegang", 400);
  }
  const now = new Date().toISOString();
  await userRef(uid).set(
    {
      membership,
      membershipUpdatedAt: now,
      membershipUpdatedBy: actorUid || null,
      updatedAt: now,
    },
    { merge: true },
  );
  await meter({ writes: 1 });
  return { ...existing, membership, membershipUpdatedAt: now };
}

export async function setStripeIds(
  uid: string,
  patch: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    membership?: MembershipStatus;
  },
) {
  await userRef(uid).set(
    {
      ...patch,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  await meter({ writes: 1 });
}

export async function findUserByStripeCustomerId(
  customerId: string,
): Promise<UserProfile | null> {
  const snap = await usersCol()
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  await meter({ reads: Math.max(1, snap.size) });
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

export async function findUserByEmail(
  email: string,
): Promise<UserProfile | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const snap = await usersCol().where("email", "==", normalized).limit(1).get();
  await meter({ reads: Math.max(1, snap.size) });
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

export async function toAuthUser(profile: UserProfile): Promise<AuthUser> {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    membership: normalizeMembership(profile),
    disabled: Boolean(profile.disabled),
  };
}

export async function rotateIngestSecret(uid: string, plainSecret: string) {
  const hash = hashIngestSecret(plainSecret);
  const credRef = userRef(uid).collection("private").doc("mt5_credentials");
  const prev = await credRef.get();
  if (prev.exists) {
    const oldHash = (prev.data() as { ingestSecretHash?: string })
      .ingestSecretHash;
    if (oldHash) await ingestLookupCol().doc(oldHash).delete().catch(() => {});
  }
  await credRef.set({
    ingestSecretHash: hash,
    createdAt: new Date().toISOString(),
  });
  await ingestLookupCol().doc(hash).set({
    uid,
    createdAt: new Date().toISOString(),
  });
  ingestUidCache.clear();
  await meter({ reads: 1, writes: 2, deletes: prev.exists ? 1 : 0 });
}

export async function getIngestSecretMeta(uid: string) {
  const snap = await userRef(uid).collection("private").doc("mt5_credentials").get();
  await meter({ reads: 1 });
  if (!snap.exists) return { configured: false, createdAt: null as string | null };
  const data = snap.data() as { createdAt?: string };
  return { configured: true, createdAt: data.createdAt || null };
}

export async function resolveUidFromIngestSecret(
  secret: string | null,
): Promise<string | null> {
  if (!secret) return null;
  const hash = hashIngestSecret(secret);
  const cached = ingestUidCache.get(hash);
  if (cached && Date.now() - cached.at < INGEST_CACHE_MS) {
    return cached.uid;
  }

  const snap = await ingestLookupCol().doc(hash).get();
  if (!snap.exists) {
    ingestUidCache.set(hash, { uid: null, at: Date.now() });
    return null;
  }
  const uid = (snap.data() as { uid?: string }).uid;
  if (!uid) {
    ingestUidCache.set(hash, { uid: null, at: Date.now() });
    return null;
  }
  // defensive re-check hash stored on user
  const cred = await userRef(uid).collection("private").doc("mt5_credentials").get();
  const stored = (cred.data() as { ingestSecretHash?: string } | undefined)
    ?.ingestSecretHash;
  if (!stored || !secretsEqual(stored, hash)) {
    ingestUidCache.set(hash, { uid: null, at: Date.now() });
    return null;
  }
  const profile = await getUserProfile(uid);
  if (!profile || profile.disabled || !hasPlatformAccess(profile)) {
    ingestUidCache.set(hash, { uid: null, at: Date.now() });
    return null;
  }
  ingestUidCache.set(hash, { uid, at: Date.now() });
  return uid;
}

export async function writeAuditLog(entry: {
  actorUid: string;
  action: string;
  targetUid?: string;
  meta?: Record<string, unknown>;
}) {
  await adminDb().collection("audit_logs").add({
    ...entry,
    createdAt: new Date().toISOString(),
  });
  await meter({ writes: 1 });
}
