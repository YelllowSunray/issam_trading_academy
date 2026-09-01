import { createHash, createHmac, timingSafeEqual } from "crypto";
import { ApiError } from "@/lib/api/errors";

export function telegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function telegramBotUsername() {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || "";
}

export function telegramConfigured() {
  return Boolean(telegramBotToken() && telegramBotUsername());
}

export type TelegramWidgetUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

export function verifyTelegramLogin(data: TelegramWidgetUser) {
  const token = telegramBotToken();
  if (!token) throw new ApiError("Telegram-bot is niet geconfigureerd", 503);
  const { hash, ...rest } = data;
  if (!hash) return false;
  const check = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  const hmac = createHmac("sha256", secret).update(check).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(String(hash));
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate)) return false;
  if (Math.abs(Date.now() / 1000 - authDate) > 60 * 60 * 24) return false;
  return true;
}

export async function createChatInviteLink(input: {
  chatId: string;
  name: string;
  expireUnix: number;
}) {
  const token = telegramBotToken();
  if (!token) throw new ApiError("Telegram-bot is niet geconfigureerd", 503);
  const res = await fetch(
    `https://api.telegram.org/bot${token}/createChatInviteLink`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: input.chatId,
        name: input.name.slice(0, 32),
        expire_date: input.expireUnix,
        member_limit: 1,
      }),
    },
  );
  const json = (await res.json()) as {
    ok?: boolean;
    description?: string;
    result?: { invite_link?: string };
  };
  if (!json.ok || !json.result?.invite_link) {
    throw new ApiError(json.description || "Telegram invite mislukt", 502);
  }
  return json.result.invite_link;
}
