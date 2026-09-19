import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { isStripeReady, createCheckoutSession } from "@/lib/stripe/server";
import { appOrigin } from "@/lib/platform/site";
import { getUserProfile, setStripeIds } from "@/lib/users/store";

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req, { allowWithoutMembership: true });
    if (!isStripeReady()) {
      return jsonError(
        "Stripe is nog niet geconfigureerd. Vraag Issam om je toegang te geven.",
        503,
      );
    }
    const origin = appOrigin(req);
    const body = (await req.json().catch(() => ({}))) as { planId?: string };
    const profile = await getUserProfile(user.uid);
    const session = await createCheckoutSession({
      uid: user.uid,
      email: user.email,
      customerId: profile?.stripeCustomerId,
      planId: body.planId,
      successUrl: `${origin}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/settings?checkout=cancel`,
    });
    const customerId =
      typeof session.customer === "string" ? session.customer : null;
    if (customerId) {
      await setStripeIds(user.uid, { stripeCustomerId: customerId });
    }
    return NextResponse.json({ url: session.url });
  });
}
