import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Approximate Blaze pricing (multi-region), treated as EUR with a 15% safety buffer.
 * This is NOT the Google invoice — only ops our Admin SDK performs.
 * Free-tier allowance is intentionally ignored (conservative).
 */
const BUFFER = 1.15;
const PRICE_READ = (0.06 / 100_000) * BUFFER;
const PRICE_WRITE = (0.18 / 100_000) * BUFFER;
const PRICE_DELETE = (0.02 / 100_000) * BUFFER;
const PRICE_STORAGE_GB_MONTH = 0.18 * BUFFER;

/** Flush buffered meter increments at most this often (cuts write amplification). */
const FLUSH_MS = 60_000;

export type UsageDelta = {
  reads?: number;
  writes?: number;
  deletes?: number;
  uploadBytes?: number;
};

export type UsageSnapshot = {
  period: string;
  reads: number;
  writes: number;
  deletes: number;
  uploadBytes: number;
  estimatedCostEur: number;
  budgetEur: number;
  percentUsed: number;
};

type Pending = {
  reads: number;
  writes: number;
  deletes: number;
  uploadBytes: number;
};

const pending: Pending = {
  reads: 0,
  writes: 0,
  deletes: 0,
  uploadBytes: 0,
};

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing: Promise<void> | null = null;

function periodKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function usageRef(period = periodKey()) {
  return adminDb().collection("system_usage").doc(period);
}

export function estimateCostEur(input: {
  reads: number;
  writes: number;
  deletes: number;
  uploadBytes: number;
}) {
  const storageGb = input.uploadBytes / (1024 * 1024 * 1024);
  return (
    input.reads * PRICE_READ +
    input.writes * PRICE_WRITE +
    input.deletes * PRICE_DELETE +
    storageGb * PRICE_STORAGE_GB_MONTH
  );
}

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  await flushUsage();
  const period = periodKey();
  const budgetEur = Number(process.env.BILLING_BUDGET_EUR || 10) || 10;
  const snap = await usageRef(period).get();
  const data = (snap.data() || {}) as Partial<UsageSnapshot>;
  const reads = Number(data.reads || 0);
  const writes = Number(data.writes || 0);
  const deletes = Number(data.deletes || 0);
  const uploadBytes = Number(data.uploadBytes || 0);
  const estimatedCostEur = estimateCostEur({
    reads,
    writes,
    deletes,
    uploadBytes,
  });
  return {
    period,
    reads,
    writes,
    deletes,
    uploadBytes,
    estimatedCostEur,
    budgetEur,
    percentUsed: budgetEur > 0 ? (estimatedCostEur / budgetEur) * 100 : 0,
  };
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushUsage();
  }, FLUSH_MS);
  // Don't keep serverless isolate alive solely for the meter.
  if (typeof flushTimer === "object" && flushTimer && "unref" in flushTimer) {
    flushTimer.unref();
  }
}

/** Record billable ops. Do not call for system/billing or system_usage itself. */
export async function trackUsage(delta: UsageDelta) {
  const reads = Math.max(0, Math.floor(delta.reads || 0));
  const writes = Math.max(0, Math.floor(delta.writes || 0));
  const deletes = Math.max(0, Math.floor(delta.deletes || 0));
  const uploadBytes = Math.max(0, Math.floor(delta.uploadBytes || 0));
  if (!reads && !writes && !deletes && !uploadBytes) return;

  pending.reads += reads;
  pending.writes += writes;
  pending.deletes += deletes;
  pending.uploadBytes += uploadBytes;
  scheduleFlush();
}

export async function flushUsage() {
  if (flushing) return flushing;
  if (
    !pending.reads &&
    !pending.writes &&
    !pending.deletes &&
    !pending.uploadBytes
  ) {
    return;
  }

  const batch: Pending = {
    reads: pending.reads,
    writes: pending.writes,
    deletes: pending.deletes,
    uploadBytes: pending.uploadBytes,
  };
  pending.reads = 0;
  pending.writes = 0;
  pending.deletes = 0;
  pending.uploadBytes = 0;

  flushing = (async () => {
    try {
      const period = periodKey();
      await usageRef(period).set(
        {
          period,
          reads: FieldValue.increment(batch.reads),
          writes: FieldValue.increment(batch.writes),
          deletes: FieldValue.increment(batch.deletes),
          uploadBytes: FieldValue.increment(batch.uploadBytes),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err) {
      // Put failed increments back so a later flush can retry.
      pending.reads += batch.reads;
      pending.writes += batch.writes;
      pending.deletes += batch.deletes;
      pending.uploadBytes += batch.uploadBytes;
      scheduleFlush();
      throw err;
    } finally {
      flushing = null;
    }
  })();

  return flushing;
}
