import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { getPlatformSettings } from "@/lib/platform/settings";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const settings = await getPlatformSettings();
    return NextResponse.json({
      label: settings.telegramLabel,
      note: settings.communityNote,
      url: settings.telegramInviteUrl || null,
    });
  });
}
