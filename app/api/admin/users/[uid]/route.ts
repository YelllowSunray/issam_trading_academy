import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import { adminAuth } from "@/lib/firebase/admin";
import {
  getUserProfile,
  setUserDisabled,
  writeAuditLog,
} from "@/lib/users/store";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ uid: string }> },
) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const { uid } = await ctx.params;
    const body = (await req.json()) as { disabled?: boolean };
    if (typeof body.disabled !== "boolean") {
      return jsonError("disabled boolean required");
    }
    if (uid === admin.uid && body.disabled) {
      return jsonError("cannot disable yourself");
    }
    const profile = await getUserProfile(uid);
    if (!profile) return jsonError("user not found", 404);

    await setUserDisabled(uid, body.disabled);
    await adminAuth().updateUser(uid, { disabled: body.disabled });
    await writeAuditLog({
      actorUid: admin.uid,
      action: body.disabled ? "user_disabled" : "user_enabled",
      targetUid: uid,
    });
    return NextResponse.json({ ok: true, uid, disabled: body.disabled });
  });
}
