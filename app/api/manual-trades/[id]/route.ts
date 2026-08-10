import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { deleteManualTrade } from "@/lib/journal/store";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const { id } = await ctx.params;
    await deleteManualTrade(user.uid, id);
    return NextResponse.json({ ok: true });
  });
}
