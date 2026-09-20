import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { isVipTelegramTier } from "@/lib/auth/membership";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { VIP_PUBLIC_CHANNEL } from "@/lib/platform/plans";
import { getPlatformSettings } from "@/lib/platform/settings";
import { tRequest } from "@/lib/i18n/server";
import { createChatInviteLink, telegramConfigured } from "@/lib/telegram/bot";
import {
  getUserProfile,
  setTelegramInvite,
} from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req, { allowWithoutMembership: true });
    const uid = await resolveTargetUid(req, user);
    const viewingOther = uid !== user.uid;
    const settings = await getPlatformSettings();
    const profile = await getUserProfile(uid);
    const vip = isVipTelegramTier({
      role: profile?.role || user.role,
      membership: profile?.membership || user.membership,
    });
    const tier = vip ? "vip" : "normal";
    const chatId = vip
      ? settings.telegramVipChatId
      : settings.telegramNormalChatId;
    const fallback = settings.telegramInviteUrl || null;
    const publicChannel = VIP_PUBLIC_CHANNEL;

    let url: string | null = null;
    let expiresAt: string | null = null;
    let source: "personal" | "fallback" | null = null;

    const cached =
      profile?.telegramInviteUrl &&
      profile.telegramInviteTier === tier &&
      profile.telegramInviteExpiresAt &&
      Date.parse(profile.telegramInviteExpiresAt) > Date.now() + 5 * 60 * 1000
        ? profile
        : null;

    if (cached?.telegramInviteUrl) {
      url = cached.telegramInviteUrl;
      expiresAt = cached.telegramInviteExpiresAt || null;
      source = "personal";
    } else if (
      !viewingOther &&
      telegramConfigured() &&
      chatId &&
      profile?.telegramId
    ) {
      const expireUnix = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      url = await createChatInviteLink({
        chatId,
        name: user.uid.slice(0, 32),
        expireUnix,
      });
      expiresAt = new Date(expireUnix * 1000).toISOString();
      source = "personal";
      await setTelegramInvite(user.uid, {
        telegramInviteUrl: url,
        telegramInviteExpiresAt: expiresAt,
        telegramInviteChatId: chatId,
        telegramInviteTier: tier,
      });
    } else if (fallback) {
      url = fallback;
      source = "fallback";
    } else if (!profile?.telegramId || viewingOther) {
      return NextResponse.json({
        label: settings.telegramLabel,
        note: settings.communityNote,
        url: null,
        tier,
        linked: Boolean(profile?.telegramId),
        telegramUsername: profile?.telegramUsername || null,
        publicChannel,
        botUsername: viewingOther
          ? null
          : process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || null,
        expiresAt: null,
      });
    } else {
      return jsonError(await tRequest("api.telegramGroups"), 503);
    }

    return NextResponse.json({
      label: settings.telegramLabel,
      note: settings.communityNote,
      url,
      tier,
      linked: Boolean(profile?.telegramId),
      telegramUsername: profile?.telegramUsername || null,
      publicChannel,
      botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || null,
      expiresAt,
      source,
    });
  });
}
