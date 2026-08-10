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

/** Record billable ops. Do not call for system/billing or system_usage itself. */
export async function trackUsage(delta: UsageDelta) {
  const period = periodKey();
  const reads = Math.max(0, Math.floor(delta.reads || 0));
  const writes = Math.max(0, Math.floor(delta.writes || 0));
  const deletes = Math.max(0, Math.floor(delta.deletes || 0));
  const uploadBytes = Math.max(0, Math.floor(delta.uploadBytes || 0));
  if (!reads && !writes && !deletes && !uploadBytes) return;

  await usageRef(period).set(
    {
      period,
      reads: FieldValue.increment(reads),
      writes: FieldValue.increment(writes),
      deletes: FieldValue.increment(deletes),
      uploadBytes: FieldValue.increment(uploadBytes),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
