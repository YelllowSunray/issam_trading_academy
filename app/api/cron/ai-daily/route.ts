import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return Boolean(match && match[1] === secret);
}

/** Disabled on free-tier Groq: briefs generate on first Home open instead. */
export async function GET(req: Request) {
  return withApiError(async () => {
    if (!authorized(req)) return jsonError("unauthorized", 401);
    return NextResponse.json({ ok: true, skipped: "on_demand" });
  });
}
