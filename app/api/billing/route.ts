import { NextResponse } from "next/server";
import { withApiError, ApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { isBillingOwner } from "@/lib/billing/owner";
import {
  billingPublicMessage,
  getBillingState,
  setBillingExceeded,
} from "@/lib/billing/store";
import { getUsageSnapshot } from "@/lib/billing/meter";
import { writeAuditLog } from "@/lib/users/store";
import { getRequestLocale } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    // Readable while locked so the UI can show the block screen.
    await requireAuthUser(req, {
      allowWhenBillingExceeded: true,
      allowWithoutMembership: true,
    });
    const locale = await getRequestLocale();
    const [state, usage] = await Promise.all([
      getBillingState(),
      getUsageSnapshot(),
    ]);
    return NextResponse.json(billingPublicMessage(state, usage, locale));
  });
}

export async function PATCH(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req, {
      allowWhenBillingExceeded: true,
      allowWithoutMembership: true,
    });
    if (!isBillingOwner(user.email)) {
      throw new ApiError(
        "Only Samir can lock or unlock the app manually.",
        403,
      );
    }
    const body = (await req.json()) as { exceeded?: boolean; reason?: string };
    if (typeof body.exceeded !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "exceeded boolean required" },
        { status: 400 },
      );
    }
    const state = await setBillingExceeded({
      exceeded: body.exceeded,
      reason: body.reason ?? (body.exceeded ? "manual_lock" : "manual_unlock"),
      updatedBy: user.uid,
    });
    await writeAuditLog({
      actorUid: user.uid,
      action: body.exceeded ? "billing_lock" : "billing_unlock",
      meta: { reason: state.reason },
    });
    const usage = await getUsageSnapshot();
    return NextResponse.json(billingPublicMessage(state, usage, await getRequestLocale()));
  });
}
