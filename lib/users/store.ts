import { trackUsage } from "@/lib/billing/meter";
import { adminDb } from "@/lib/firebase/admin";
import { hashIngestSecret, secretsEqual } from "@/lib/auth/secrets";
import type { AuthUser, UserProfile, UserRole } from "@/lib/auth/types";

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
      disabled: false,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(profile);
    await meter({ reads: 1, writes: 1 });
    return profile;
  }

  const existing = snap.data() as UserProfile;
  const role: UserRole =
    existing.role === "admin" || isAdmin ? "admin" : "student";
  const next: UserProfile = {
    ...existing,
    email: email || existing.email,
    displayName: input.displayName || existing.displayName,
    role,
    updatedAt: now,
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
    throw new Response(JSON.stringify({ ok: false, error: "user not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const displayName =
    typeof patch.displayName === "string"
      ? patch.displayName.trim()
      : existing.displayName;

  if (!displayName || displayName.length < 2) {
    throw new Response(
      JSON.stringify({ ok: false, error: "Naam moet minstens 2 tekens zijn" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
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
    .map((d) => d.data() as UserProfile)
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

export async function toAuthUser(profile: UserProfile): Promise<AuthUser> {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
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
  const snap = await ingestLookupCol().doc(hash).get();
  if (!snap.exists) return null;
  const uid = (snap.data() as { uid?: string }).uid;
  if (!uid) return null;
  // defensive re-check hash stored on user
  const cred = await userRef(uid).collection("private").doc("mt5_credentials").get();
  const stored = (cred.data() as { ingestSecretHash?: string } | undefined)
    ?.ingestSecretHash;
  if (!stored || !secretsEqual(stored, hash)) return null;
  const profile = await getUserProfile(uid);
  if (!profile || profile.disabled) return null;
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
