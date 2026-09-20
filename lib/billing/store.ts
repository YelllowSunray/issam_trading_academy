import { adminDb } from "@/lib/firebase/admin";
import { getUsageSnapshot } from "@/lib/billing/meter";
import { billingOwnerEmail } from "@/lib/billing/owner";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

export type BillingState = {
  exceeded: boolean;
  budgetEur: number;
  reason: string | null;
  contactName: string;
  contactEmail: string;
  whatsappE164: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

const DEFAULT_BUDGET = 10;

function billingRef() {
  return adminDb().collection("system").doc("billing");
}

export function billingPublicMessage(
  state: BillingState,
  usage?: Awaited<ReturnType<typeof getUsageSnapshot>>,
  locale: Locale = DEFAULT_LOCALE,
) {
  const budget = state.budgetEur || DEFAULT_BUDGET;
  const ownerEmail = billingOwnerEmail();
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const customerMessage = t("billing.studentMessage", {
    budget,
    email: state.contactEmail,
  });
  return {
    exceeded: state.exceeded,
    budgetEur: budget,
    title: t("billing.title"),
    studentMessage: customerMessage,
    adminMessage: customerMessage,
    ownerMessage: t("billing.ownerMessage", { budget }),
    ownerEmail,
    contactName: state.contactName,
    contactEmail: state.contactEmail,
    whatsappE164: state.whatsappE164,
    whatsappUrl: state.whatsappE164
      ? `https://wa.me/${state.whatsappE164.replace(/\D/g, "")}?text=${encodeURIComponent(
          t("billing.waText", { budget }),
        )}`
      : null,
    usage: usage
      ? {
          period: usage.period,
          estimatedCostEur: Number(usage.estimatedCostEur.toFixed(4)),
          percentUsed: Number(usage.percentUsed.toFixed(1)),
          reads: usage.reads,
          writes: usage.writes,
          deletes: usage.deletes,
          uploadBytes: usage.uploadBytes,
        }
      : null,
  };
}

export async function getBillingState(): Promise<BillingState> {
  const hardStop = process.env.BILLING_HARD_STOP === "true";
  const budgetEur = Number(process.env.BILLING_BUDGET_EUR || DEFAULT_BUDGET) || DEFAULT_BUDGET;
  const contactName = process.env.BILLING_CONTACT_NAME || "Samir";
  const contactEmail =
    process.env.BILLING_CONTACT_EMAIL || "iyersamir@gmail.com";
  const whatsappE164 =
    process.env.NEXT_PUBLIC_BILLING_WHATSAPP ||
    process.env.BILLING_WHATSAPP ||
    null;

  const snap = await billingRef().get();
  const data = (snap.data() || {}) as Partial<BillingState>;

  return {
    exceeded: hardStop || Boolean(data.exceeded),
    budgetEur: data.budgetEur ?? budgetEur,
    reason: data.reason ?? null,
    contactName: data.contactName || contactName,
    contactEmail: data.contactEmail || contactEmail,
    whatsappE164: data.whatsappE164 || whatsappE164,
    updatedAt: data.updatedAt ?? null,
    updatedBy: data.updatedBy ?? null,
  };
}

export async function setBillingExceeded(input: {
  exceeded: boolean;
  reason?: string | null;
  updatedBy?: string | null;
}) {
  const current = await getBillingState();
  const next: BillingState = {
    ...current,
    exceeded: input.exceeded,
    reason: input.reason ?? (input.exceeded ? "budget_exceeded" : null),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? null,
  };
  await billingRef().set(next, { merge: true });
  return next;
}

type BillingCache = {
  at: number;
  state: BillingState;
};

let billingCache: BillingCache | null = null;
const BILLING_CACHE_MS = 120_000;

export async function assertBillingActive() {
  const now = Date.now();
  if (billingCache && now - billingCache.at < BILLING_CACHE_MS) {
    if (!billingCache.state.exceeded) return billingCache.state;
    // Fall through when locked so clients still get the full 503 payload.
  }

  let state = await getBillingState();

  // Self-metered usage can lock the app without a GCP budget alert.
  if (!state.exceeded) {
    const usage = await getUsageSnapshot();
    if (usage.estimatedCostEur >= usage.budgetEur) {
      state = await setBillingExceeded({
        exceeded: true,
        reason: `usage_meter_${usage.period}_${usage.estimatedCostEur.toFixed(4)}`,
        updatedBy: "usage-meter",
      });
    }
  }

  billingCache = { at: now, state };

  if (!state.exceeded) return state;

  const usage = await getUsageSnapshot().catch(() => undefined);
  const payload = {
    ok: false,
    error: "billing_exceeded",
    billing: billingPublicMessage(state, usage),
  };
  throw new Response(JSON.stringify(payload), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
