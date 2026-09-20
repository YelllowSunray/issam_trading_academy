import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { appOrigin } from "@/lib/platform/site";
import { createCustomerPortalSession, isStripeReady } from "@/lib/stripe/server";
import { getUserProfile } from "@/lib/users/store";
import { tRequest } from "@/lib/i18n/server";

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req, { allowWithoutMembership: true });
    if (!isStripeReady()) return jsonError(await tRequest("api.stripeNotConfigured"), 503);
    const profile = await getUserProfile(user.uid);
    if (!profile?.stripeCustomerId) {
      return jsonError(await tRequest("api.noStripeCustomer"), 400);
    }
    const origin = appOrigin(req);
    const session = await createCustomerPortalSession({
      customerId: profile.stripeCustomerId,
      returnUrl: `${origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  });
}
