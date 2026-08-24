import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { MEMBERSHIP_STATUSES } from "@/lib/auth/membership";
import { requireAdmin } from "@/lib/auth/request";
import type { MembershipStatus } from "@/lib/auth/types";
import { adminAuth } from "@/lib/firebase/admin";
import {
  getUserProfile,
  setUserDisabled,
  setUserMembership,
  writeAuditLog,
} from "@/lib/users/store";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ uid: string }> },
) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const { uid } = await ctx.params;
    const body = (await req.json()) as {
      disabled?: boolean;
      membership?: MembershipStatus;
    };

    const profile = await getUserProfile(uid);
    if (!profile) return jsonError("user not found", 404);

    if (typeof body.disabled === "boolean") {
      if (uid === admin.uid && body.disabled) {
        return jsonError("cannot disable yourself");
      }
      await setUserDisabled(uid, body.disabled);
      await adminAuth().updateUser(uid, { disabled: body.disabled });
      await writeAuditLog({
        actorUid: admin.uid,
        action: body.disabled ? "user_disabled" : "user_enabled",
        targetUid: uid,
      });
      return NextResponse.json({ ok: true, uid, disabled: body.disabled });
    }

    if (body.membership) {
      if (!MEMBERSHIP_STATUSES.includes(body.membership)) {
        return jsonError("ongeldige membership");
      }
      const next = await setUserMembership(uid, body.membership, admin.uid);
      await writeAuditLog({
        actorUid: admin.uid,
        action: "membership_set",
        targetUid: uid,
        meta: { membership: body.membership },
      });
      return NextResponse.json({
        ok: true,
        uid,
        membership: next.membership,
      });
    }

    return jsonError("disabled of membership verplicht");
  });
}
