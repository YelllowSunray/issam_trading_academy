import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { deleteManualTrade } from "@/lib/journal/store";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiError(async () => {
    const { id } = await ctx.params;
    await deleteManualTrade(id);
    return NextResponse.json({ ok: true });
  });
}
