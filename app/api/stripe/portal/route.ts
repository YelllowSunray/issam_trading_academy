import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { createCustomerPortalSession, isStripeReady } from "@/lib/stripe/server";
import { getUserProfile } from "@/lib/users/store";

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req, { allowWithoutMembership: true });
    if (!isStripeReady()) return jsonError("Stripe is niet geconfigureerd", 503);
    const profile = await getUserProfile(user.uid);
    if (!profile?.stripeCustomerId) {
      return jsonError("Nog geen Stripe-klant. Start eerst een abonnement.", 400);
    }
    const origin = new URL(req.url).origin;
    const session = await createCustomerPortalSession({
      customerId: profile.stripeCustomerId,
      returnUrl: `${origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  });
}
