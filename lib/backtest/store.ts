import { randomUUID } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { tRequest } from "@/lib/i18n/server";
import { trackUsage } from "@/lib/billing/meter";
import type { TradeDirection } from "@/lib/journal/types";
import { userRef } from "@/lib/users/store";
import type { BacktestEntry } from "./types";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

function col(uid: string) {
  return userRef(uid).collection("backtests");
}

export async function countBacktests(uid: string): Promise<number> {
  const snap = await col(uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.size;
}

export async function countBacktestsByUser(
  uids: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  await Promise.all(
    uids.map(async (uid) => {
      map.set(uid, await countBacktests(uid));
    }),
  );
  return map;
}

export async function listBacktests(uid: string): Promise<BacktestEntry[]> {
  const snap = await col(uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.docs
    .map((d) => d.data() as BacktestEntry)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export async function createBacktest(
  uid: string,
  input: {
    date: string;
    instrument: string;
    direction: TradeDirection;
    thesis: string;
    resultR?: string;
    notes?: string;
  },
): Promise<BacktestEntry> {
  const instrument = (input.instrument || "").trim();
  const thesis = (input.thesis || "").trim();
  if (!instrument || !thesis) {
    throw new ApiError(await tRequest("api.instrumentHypothesisRequired"), 400);
  }
  const rec: BacktestEntry = {
    id: randomUUID(),
    date: input.date || new Date().toISOString().slice(0, 10),
    instrument,
    direction: input.direction === "Short" ? "Short" : "Long",
    thesis,
    resultR: (input.resultR || "").trim(),
    notes: (input.notes || "").trim(),
    createdAt: new Date().toISOString(),
  };
  await col(uid).doc(rec.id).set(rec);
  await meter({ writes: 1 });
  return rec;
}

export async function deleteBacktest(uid: string, id: string) {
  await col(uid).doc(id).delete();
  await meter({ deletes: 1 });
}
