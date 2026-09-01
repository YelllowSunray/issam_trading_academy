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
    "Koppel je Telegram-account. De bot stuurt je een persoonlijke invite naar de juiste groep (VIP of normaal).",
  telegramVipChatId: "",
  telegramNormalChatId: "",
  stripeEnabled: false,
  subscriberPriceLabel: "€100 / maand",
  coachingPriceNote:
    "Inbegrepen bij 1:1 coaching. Prijs spreek je met Issam af — niet via Stripe.",
};

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      (process.env.STRIPE_PRICE_MONTHLY ||
        process.env.STRIPE_PRICE_ID ||
        process.env.STRIPE_PRICE_QUARTERLY ||
        process.env.STRIPE_PRICE_SEMIANNUAL ||
        process.env.STRIPE_PRICE_YEARLY),
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
    telegramVipChatId: (patch.telegramVipChatId ?? current.telegramVipChatId)
      .trim(),
    telegramNormalChatId: (
      patch.telegramNormalChatId ?? current.telegramNormalChatId
    ).trim(),
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
