import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { loadDexTrending } from "@/lib/markets/dex-trending";
import { tRequest } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const coins = await loadDexTrending();
    return NextResponse.json({
      coins,
      windows: ["h1", "h6", "h24"],
      note: await tRequest("api.dexNote"),
    });
  });
}
