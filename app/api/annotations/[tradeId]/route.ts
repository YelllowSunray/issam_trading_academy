import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { getAnnotation, upsertAnnotation } from "@/lib/journal/store";
import type { TradeAnnotation } from "@/lib/journal/types";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ tradeId: string }> },
) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const { tradeId } = await ctx.params;
    const ann = await getAnnotation(uid, tradeId);
    return NextResponse.json(ann);
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ tradeId: string }> },
) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const { tradeId } = await ctx.params;
    const body = (await req.json()) as TradeAnnotation;
    const ann = await upsertAnnotation(user.uid, tradeId, body);
    return NextResponse.json(ann);
  });
}
