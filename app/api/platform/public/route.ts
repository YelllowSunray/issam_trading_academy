import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { getPlatformSettings } from "@/lib/platform/settings";

export async function GET() {
  return withApiError(async () => {
    const settings = await getPlatformSettings();
    return NextResponse.json({
      subscriberPriceLabel: settings.subscriberPriceLabel,
      coachingPriceNote: settings.coachingPriceNote,
      stripeEnabled: settings.stripeEnabled,
    });
  });
}
