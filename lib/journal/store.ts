import { randomUUID } from "crypto";
import { trackUsage } from "@/lib/billing/meter";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import { touchJournalActivity, userRef } from "@/lib/users/store";
import type {
  AppSettings,
  ManualTrade,
  TradeAnnotation,
} from "@/lib/journal/types";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

function manualCol(uid: string) {
  return userRef(uid).collection("manual_trades");
}

function annotationsCol(uid: string) {
  return userRef(uid).collection("annotations");
}

function settingsRef(uid: string) {
  return userRef(uid).collection("settings").doc("app");
}

export async function listManualTrades(uid: string): Promise<ManualTrade[]> {
  const snap = await manualCol(uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  const trades = snap.docs.map((d) => d.data() as ManualTrade);
  trades.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return trades;
}

export async function createManualTrade(
  uid: string,
  input: Omit<ManualTrade, "id" | "createdAt"> & { id?: string },
): Promise<ManualTrade> {
  const id = input.id || randomUUID();
  const trade: ManualTrade = {
    ...input,
    id,
    tags: input.tags || [],
    notes: input.notes || "",
    imageUrl: input.imageUrl || null,
    createdAt: new Date().toISOString(),
  };
  await manualCol(uid).doc(id).set(trade);
  await meter({ writes: 1 });
  await touchJournalActivity(uid, trade.createdAt);
  return trade;
}

export async function deleteManualTrade(uid: string, id: string) {
  await manualCol(uid).doc(id).delete();
  await meter({ deletes: 1 });
  await touchJournalActivity(uid);
}

export async function getAnnotation(
  uid: string,
  tradeId: string,
): Promise<TradeAnnotation> {
  const snap = await annotationsCol(uid).doc(tradeId).get();
  await meter({ reads: 1 });
  if (!snap.exists) return { tags: [], notes: "", imageUrl: null };
  const data = snap.data() as TradeAnnotation;
  return {
    tags: data.tags || [],
    notes: data.notes || "",
    imageUrl: data.imageUrl || null,
  };
}

export async function listAnnotations(
  uid: string,
): Promise<Record<string, TradeAnnotation>> {
  const snap = await annotationsCol(uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  const out: Record<string, TradeAnnotation> = {};
  snap.docs.forEach((d) => {
    const data = d.data() as TradeAnnotation;
    out[d.id] = {
      tags: data.tags || [],
      notes: data.notes || "",
      imageUrl: data.imageUrl || null,
    };
  });
  return out;
}

export async function upsertAnnotation(
  uid: string,
  tradeId: string,
  ann: TradeAnnotation,
): Promise<TradeAnnotation> {
  const cleaned: TradeAnnotation = {
    tags: ann.tags || [],
    notes: ann.notes || "",
    imageUrl: ann.imageUrl || null,
  };
  await annotationsCol(uid).doc(tradeId).set(cleaned, { merge: true });
  await meter({ writes: 1 });
  await touchJournalActivity(uid);
  return cleaned;
}

export async function getSettings(uid: string): Promise<AppSettings> {
  const snap = await settingsRef(uid).get();
  await meter({ reads: 1 });
  if (!snap.exists) return { selectedLogin: null };
  const data = snap.data() as AppSettings;
  return { selectedLogin: data.selectedLogin ?? null };
}

export async function updateSettings(
  uid: string,
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings(uid);
  const next = { ...current, ...patch };
  await settingsRef(uid).set(next, { merge: true });
  await meter({ writes: 1 });
  return next;
}

export async function uploadScreenshot(
  uid: string,
  dataUrl: string,
  filenameHint?: string,
): Promise<string> {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Ongeldige image data-url");

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  const name = `screenshots/${uid}/${filenameHint || randomUUID()}.${ext}`;
  const file = adminBucket().file(name);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: "private,max-age=3600",
    },
    resumable: false,
  });

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  await meter({ uploadBytes: buffer.length, writes: 1 });
  return url;
}

/** Move legacy root-level collections into users/{uid}. */
export async function migrateLegacyRootDataToUser(uid: string) {
  const db = adminDb();
  const legacyAccounts = await db.collection("mt5_accounts").get();
  for (const accDoc of legacyAccounts.docs) {
    await userRef(uid)
      .collection("mt5_accounts")
      .doc(accDoc.id)
      .set(accDoc.data(), { merge: true });
    const trades = await accDoc.ref.collection("trades").get();
    for (let i = 0; i < trades.docs.length; i += 400) {
      const chunk = trades.docs.slice(i, i + 400);
      const batch = db.batch();
      chunk.forEach((t) => {
        batch.set(
          userRef(uid)
            .collection("mt5_accounts")
            .doc(accDoc.id)
            .collection("trades")
            .doc(t.id),
          t.data(),
        );
        batch.delete(t.ref);
      });
      await batch.commit();
    }
    await accDoc.ref.delete();
  }

  const manuals = await db.collection("manual_trades").get();
  for (let i = 0; i < manuals.docs.length; i += 400) {
    const chunk = manuals.docs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((d) => {
      batch.set(manualCol(uid).doc(d.id), d.data());
      batch.delete(d.ref);
    });
    await batch.commit();
  }

  const anns = await db.collection("annotations").get();
  for (let i = 0; i < anns.docs.length; i += 400) {
    const chunk = anns.docs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((d) => {
      batch.set(annotationsCol(uid).doc(d.id), d.data());
      batch.delete(d.ref);
    });
    await batch.commit();
  }

  const settings = await db.collection("settings").doc("app").get();
  if (settings.exists) {
    await settingsRef(uid).set(settings.data() || {}, { merge: true });
    await settings.ref.delete();
  }
}
