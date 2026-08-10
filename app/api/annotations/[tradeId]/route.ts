import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { getAnnotation, upsertAnnotation } from "@/lib/journal/store";
import type { TradeAnnotation } from "@/lib/journal/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ tradeId: string }> },
) {
  return withApiError(async () => {
    const { tradeId } = await ctx.params;
    const ann = await getAnnotation(tradeId);
    return NextResponse.json(ann);
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ tradeId: string }> },
) {
  return withApiError(async () => {
    const { tradeId } = await ctx.params;
    const body = (await req.json()) as TradeAnnotation;
    const ann = await upsertAnnotation(tradeId, body);
    return NextResponse.json(ann);
  });
}
