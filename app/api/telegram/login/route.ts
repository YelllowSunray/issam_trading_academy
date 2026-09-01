import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import {
  telegramConfigured,
  verifyTelegramLogin,
  type TelegramWidgetUser,
} from "@/lib/telegram/bot";
import { setTelegramIdentity } from "@/lib/users/store";

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req, { allowWithoutMembership: true });
    if (!telegramConfigured()) {
      return jsonError("Telegram-bot is nog niet geconfigureerd.", 503);
    }
    const body = (await req.json()) as TelegramWidgetUser;
    if (!verifyTelegramLogin(body)) {
      return jsonError("Ongeldige Telegram-login.", 400);
    }
    await setTelegramIdentity(user.uid, {
      telegramId: String(body.id),
      telegramUsername: body.username || null,
    });
    return NextResponse.json({
      ok: true,
      telegramId: String(body.id),
      telegramUsername: body.username || null,
    });
  });
}
