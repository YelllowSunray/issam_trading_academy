import { trackUsage } from "@/lib/billing/meter";
import { adminDb } from "@/lib/firebase/admin";
import type { PlatformSettings } from "./types";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

const DEFAULTS: PlatformSettings = {
  telegramInviteUrl: "",
  telegramLabel: "TradingAcadamy Community",
  communityNote:
    "De community draait op Telegram. Leden met actieve membership krijgen hier de invite.",
  stripeEnabled: false,
  subscriberPriceLabel: "€49 / maand",
  coachingPriceNote:
    "Inbegrepen bij 1:1 coaching. Prijs spreek je met Issam af — niet via Stripe.",
};

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID,
  );
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const snap = await adminDb().collection("system").doc("platform").get();
  await meter({ reads: 1 });
  const data = (snap.data() || {}) as Partial<PlatformSettings>;
  return {
    ...DEFAULTS,
    ...data,
    stripeEnabled: stripeConfigured(),
  };
}

export async function savePlatformSettings(
  patch: Partial<PlatformSettings>,
): Promise<PlatformSettings> {
  const current = await getPlatformSettings();
  const next: PlatformSettings = {
    ...current,
    telegramInviteUrl: (patch.telegramInviteUrl ?? current.telegramInviteUrl)
      .trim(),
    telegramLabel: (patch.telegramLabel ?? current.telegramLabel).trim(),
    communityNote: patch.communityNote ?? current.communityNote,
    subscriberPriceLabel: (
      patch.subscriberPriceLabel ?? current.subscriberPriceLabel
    ).trim(),
    coachingPriceNote: (patch.coachingPriceNote ?? current.coachingPriceNote)
      .trim(),
    stripeEnabled: stripeConfigured(),
  };
  await adminDb().collection("system").doc("platform").set(next, { merge: true });
  await meter({ writes: 1 });
  return next;
}
