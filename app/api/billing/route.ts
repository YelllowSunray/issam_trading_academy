import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAdmin, requireAuthUser } from "@/lib/auth/request";
import {
  billingPublicMessage,
  getBillingState,
  setBillingExceeded,
} from "@/lib/billing/store";
import { getUsageSnapshot } from "@/lib/billing/meter";
import { writeAuditLog } from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    // Readable while locked so the UI can show the block screen.
    await requireAuthUser(req, { allowWhenBillingExceeded: true });
    const [state, usage] = await Promise.all([
      getBillingState(),
      getUsageSnapshot(),
    ]);
    return NextResponse.json(billingPublicMessage(state, usage));
  });
}

export async function PATCH(req: Request) {
  return withApiError(async () => {
    const admin = await requireAdmin(req, { allowWhenBillingExceeded: true });
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
      updatedBy: admin.uid,
    });
    await writeAuditLog({
      actorUid: admin.uid,
      action: body.exceeded ? "billing_lock" : "billing_unlock",
      meta: { reason: state.reason },
    });
    const usage = await getUsageSnapshot();
    return NextResponse.json(billingPublicMessage(state, usage));
  });
}
