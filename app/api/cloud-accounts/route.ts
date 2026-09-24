import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireAuthUser } from "@/lib/auth/request";
import { api2tradeConfigured } from "@/lib/api2trade/client";
import { registerStudentAccount } from "@/lib/api2trade/sync";
import { tRequest } from "@/lib/i18n/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    if (!api2tradeConfigured()) {
      return jsonError(await tRequest("api.api2tradeNotConfigured"), 500);
    }
    if (!rateLimit(`cloud-register:${user.uid}`, 3, 10 * 60_000)) {
      return jsonError(await tRequest("api.cloudRegisterLimited"), 429);
    }

    const body = (await req.json()) as {
      login?: string;
      password?: string;
      server?: string;
      name?: string;
      platform?: "Metatrader 5" | "Metatrader 4";
    };

    const result = await registerStudentAccount({
      email: user.email,
      login: body.login || "",
      password: body.password || "",
      server: body.server || "",
      name: body.name,
      platform: body.platform,
      actorUid: user.uid,
    });

    return NextResponse.json({ ok: true, result });
  });
}
