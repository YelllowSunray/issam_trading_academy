import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import { unlinkCloudAccount } from "@/lib/api2trade/sync";
import { writeAuditLog } from "@/lib/users/store";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const { id } = await ctx.params;
    if (!id) return jsonError("id verplicht");
    const { searchParams } = new URL(req.url);
    const deleteVendor = searchParams.get("vendor") === "1";
    const rec = await unlinkCloudAccount(id, { deleteVendor });
    await writeAuditLog({
      actorUid: admin.uid,
      action: deleteVendor ? "cloud_account_deleted" : "cloud_account_unlinked",
      meta: { accountId: id, email: rec.email },
    });
    return NextResponse.json({ ok: true });
  });
}
