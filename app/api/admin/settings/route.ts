import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import {
  getPlatformSettings,
  savePlatformSettings,
} from "@/lib/platform/settings";
import { writeAuditLog } from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    return NextResponse.json(await getPlatformSettings());
  });
}

export async function PUT(req: Request) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const body = (await req.json()) as {
      telegramInviteUrl?: string;
      telegramLabel?: string;
      communityNote?: string;
      subscriberPriceLabel?: string;
      coachingPriceNote?: string;
    };
    const settings = await savePlatformSettings(body);
    await writeAuditLog({
      actorUid: admin.uid,
      action: "platform_settings",
    });
    return NextResponse.json(settings);
  });
}
