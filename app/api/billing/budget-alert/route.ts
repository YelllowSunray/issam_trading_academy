import { NextResponse } from "next/server";
import { withApiError, jsonError } from "@/lib/api/errors";
import { setBillingExceeded } from "@/lib/billing/store";
import { writeAuditLog } from "@/lib/users/store";

/**
 * Google Cloud Budget → Pub/Sub → push to this webhook (or call manually).
 * Auth: header x-billing-webhook-secret === BILLING_WEBHOOK_SECRET
 *
 * When a threshold notification arrives, we hard-lock the app.
 */
export async function POST(req: Request) {
  return withApiError(async () => {
    const expected = process.env.BILLING_WEBHOOK_SECRET?.trim();
    if (!expected) return jsonError("webhook not configured", 503);
    const got = req.headers.get("x-billing-webhook-secret");
    if (got !== expected) return jsonError("unauthorized", 401);

    const body = (await req.json().catch(() => ({}))) as {
      exceeded?: boolean;
      reason?: string;
      // Pub/Sub push wraps the message; accept either shape.
      message?: { data?: string };
    };

    let exceeded = body.exceeded !== false;
    let reason = body.reason || "gcp_budget_alert";

    if (body.message?.data) {
      try {
        const decoded = JSON.parse(
          Buffer.from(body.message.data, "base64").toString("utf8"),
        ) as { costAmount?: number; budgetAmount?: number; alertThresholdExceeded?: number };
        reason = "gcp_budget_pubsub";
        if (
          typeof decoded.costAmount === "number" &&
          typeof decoded.budgetAmount === "number"
        ) {
          exceeded = decoded.costAmount >= decoded.budgetAmount;
        } else {
          exceeded = true;
        }
      } catch {
        exceeded = true;
      }
    }

    const state = await setBillingExceeded({
      exceeded,
      reason,
      updatedBy: "budget-webhook",
    });

    await writeAuditLog({
      actorUid: "system",
      action: exceeded ? "billing_lock_webhook" : "billing_unlock_webhook",
      meta: { reason },
    });

    return NextResponse.json({ ok: true, exceeded: state.exceeded });
  });
}
