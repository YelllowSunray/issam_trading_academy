import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { VIP_PERKS, VIP_PLANS } from "@/lib/platform/plans";
import { getPlatformSettings } from "@/lib/platform/settings";
import { publicPlanAvailability } from "@/lib/stripe/server";

export async function GET() {
  return withApiError(async () => {
    const settings = await getPlatformSettings();
    const available = publicPlanAvailability();
    return NextResponse.json({
      subscriberPriceLabel: settings.subscriberPriceLabel,
      coachingPriceNote: settings.coachingPriceNote,
      stripeEnabled: settings.stripeEnabled,
      perks: VIP_PERKS,
      plans: VIP_PLANS.map((p) => ({
        ...p,
        available: available[p.id],
      })),
    });
  });
}
