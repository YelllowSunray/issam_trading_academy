import { randomUUID } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { tRequest } from "@/lib/i18n/server";
import { trackUsage } from "@/lib/billing/meter";
import { adminDb } from "@/lib/firebase/admin";
import type { TradeDirection } from "@/lib/journal/types";
import type { SignalStatus, TradeSignal } from "./types";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

function col() {
  return adminDb().collection("signals");
}

export async function listSignals(limit = 40): Promise<TradeSignal[]> {
  const snap = await col().get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.docs
    .map((d) => d.data() as TradeSignal)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, limit);
}

export async function getLatestSignal(): Promise<TradeSignal | null> {
  const rows = await listSignals(1);
  return rows[0] || null;
}

export async function upsertSignal(
  input: Partial<TradeSignal> & {
    instrument: string;
    direction: TradeDirection;
    entry: string;
    sl: string;
  },
  actorUid: string,
): Promise<TradeSignal> {
  const id = input.id || randomUUID();
  const now = new Date().toISOString();
  const existing = input.id ? await col().doc(id).get() : null;
  const prev = existing?.exists ? (existing.data() as TradeSignal) : null;
  const tps = Array.isArray(input.tps)
    ? input.tps.map((t) => String(t).trim()).filter(Boolean)
    : prev?.tps || [];
  const status: SignalStatus =
    input.status === "closed" || input.status === "open"
      ? input.status
      : prev?.status || "open";
  const rec: TradeSignal = {
    id,
    instrument: input.instrument.trim(),
    direction: input.direction,
    entry: String(input.entry).trim(),
    sl: String(input.sl).trim(),
    tps,
    thesis: (input.thesis || prev?.thesis || "").trim(),
    status,
    createdAt: prev?.createdAt || now,
    createdBy: prev?.createdBy || actorUid,
    updatedAt: now,
  };
  if (!rec.instrument || !rec.entry || !rec.sl) {
    throw new ApiError(await tRequest("api.instrumentEntrySlRequired"), 400);
  }
  await col().doc(id).set(rec);
  await meter({ writes: 1, reads: existing ? 1 : 0 });
  return rec;
}

export async function deleteSignal(id: string) {
  await col().doc(id).delete();
  await meter({ deletes: 1 });
}
