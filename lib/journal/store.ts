import { randomUUID } from "crypto";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import type {
  AppSettings,
  ManualTrade,
  TradeAnnotation,
} from "@/lib/journal/types";

function manualCol() {
  return adminDb().collection("manual_trades");
}

function annotationsCol() {
  return adminDb().collection("annotations");
}

function settingsRef() {
  return adminDb().collection("settings").doc("app");
}

export async function listManualTrades(): Promise<ManualTrade[]> {
  const snap = await manualCol().get();
  const trades = snap.docs.map((d) => d.data() as ManualTrade);
  trades.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return trades;
}

export async function createManualTrade(
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
  await manualCol().doc(id).set(trade);
  return trade;
}

export async function deleteManualTrade(id: string) {
  await manualCol().doc(id).delete();
}

export async function getAnnotation(tradeId: string): Promise<TradeAnnotation> {
  const snap = await annotationsCol().doc(tradeId).get();
  if (!snap.exists) return { tags: [], notes: "", imageUrl: null };
  const data = snap.data() as TradeAnnotation;
  return {
    tags: data.tags || [],
    notes: data.notes || "",
    imageUrl: data.imageUrl || null,
  };
}

export async function listAnnotations(): Promise<Record<string, TradeAnnotation>> {
  const snap = await annotationsCol().get();
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
  tradeId: string,
  ann: TradeAnnotation,
): Promise<TradeAnnotation> {
  const cleaned: TradeAnnotation = {
    tags: ann.tags || [],
    notes: ann.notes || "",
    imageUrl: ann.imageUrl || null,
  };
  await annotationsCol().doc(tradeId).set(cleaned, { merge: true });
  return cleaned;
}

export async function getSettings(): Promise<AppSettings> {
  const snap = await settingsRef().get();
  if (!snap.exists) return { selectedLogin: null };
  const data = snap.data() as AppSettings;
  return { selectedLogin: data.selectedLogin ?? null };
}

export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await settingsRef().set(next, { merge: true });
  return next;
}

export async function uploadScreenshot(
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
  const name = `screenshots/${filenameHint || randomUUID()}.${ext}`;
  const file = adminBucket().file(name);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: "public,max-age=31536000",
    },
    public: true,
  });

  try {
    await file.makePublic();
  } catch {
    // bucket may already allow public reads via IAM
  }

  return `https://storage.googleapis.com/${adminBucket().name}/${name}`;
}
