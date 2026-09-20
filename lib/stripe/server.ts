import { createHmac, timingSafeEqual } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { isVipPlanId, type VipPlanId } from "@/lib/platform/plans";
import { tRequest } from "@/lib/i18n/server";

function stripeSecret() {
  return process.env.STRIPE_SECRET_KEY || "";
}

export function isStripeReady() {
  return Boolean(
    stripeSecret() &&
      (process.env.STRIPE_PRICE_MONTHLY ||
        process.env.STRIPE_PRICE_ID ||
        process.env.STRIPE_PRICE_QUARTERLY ||
        process.env.STRIPE_PRICE_SEMIANNUAL ||
        process.env.STRIPE_PRICE_YEARLY),
  );
}

export function stripePriceForPlan(planId: VipPlanId | string | null | undefined) {
  const id = isVipPlanId(planId) ? planId : "monthly";
  const map: Record<VipPlanId, string | undefined> = {
    monthly: process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_ID,
    quarterly: process.env.STRIPE_PRICE_QUARTERLY,
    semiannual: process.env.STRIPE_PRICE_SEMIANNUAL,
    yearly: process.env.STRIPE_PRICE_YEARLY,
  };
  return { planId: id, priceId: (map[id] || "").trim() };
}

export function publicPlanAvailability() {
  return {
    monthly: Boolean(
      process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_ID,
    ),
    quarterly: Boolean(process.env.STRIPE_PRICE_QUARTERLY),
    semiannual: Boolean(process.env.STRIPE_PRICE_SEMIANNUAL),
    yearly: Boolean(process.env.STRIPE_PRICE_YEARLY),
  };
}

async function stripeGet(path: string): Promise<Record<string, unknown>> {
  const secret = stripeSecret();
  if (!secret) throw new ApiError("Stripe is not configured", 503);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new ApiError(err?.message || "Stripe error", res.status);
  }
  return json;
}

async function stripeForm(
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const secret = stripeSecret();
  if (!secret) throw new ApiError("Stripe is not configured", 503);
  const body = new URLSearchParams(params);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new ApiError(err?.message || "Stripe error", res.status);
  }
  return json;
}

export async function createCheckoutSession(input: {
  uid: string;
  email: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
  planId?: VipPlanId | string | null;
}) {
  const { planId, priceId } = stripePriceForPlan(input.planId);
  if (!priceId) {
    throw new ApiError(
      await tRequest("api.vipPlanMissing", { plan: planId }),
      503,
    );
  }
  const price = priceId;
  const params: Record<string, string> = {
    mode: "subscription",
    success_url: input.successUrl.includes("{CHECKOUT_SESSION_ID}")
      ? input.successUrl
      : `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl,
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: input.uid,
    "metadata[uid]": input.uid,
    "metadata[planId]": planId,
    "subscription_data[metadata][uid]": input.uid,
    "subscription_data[metadata][planId]": planId,
  };
  if (input.customerId) params.customer = input.customerId;
  else params.customer_email = input.email;
  return stripeForm("checkout/sessions", params);
}

export async function retrieveCheckoutSession(sessionId: string) {
  return stripeGet(
    `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
  );
}

export async function createCustomerPortalSession(input: {
  customerId: string;
  returnUrl: string;
}) {
  return stripeForm("billing_portal/sessions", {
    customer: input.customerId,
    return_url: input.returnUrl,
  });
}

export function verifyStripeSignature(rawBody: string, header: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [k, ...rest] = part.split("=");
      return [k.trim(), rest.join("=")];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > 60 * 5) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
