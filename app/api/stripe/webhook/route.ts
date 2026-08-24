import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { verifyStripeSignature } from "@/lib/stripe/server";
import {
  findUserByStripeCustomerId,
  setStripeIds,
  userRef,
} from "@/lib/users/store";

type StripeObj = {
  id?: string;
  customer?: string;
  client_reference_id?: string;
  metadata?: { uid?: string };
  subscription?: string;
  status?: string;
};

export async function POST(req: Request) {
  return withApiError(async () => {
    const raw = await req.text();
    const ok = verifyStripeSignature(raw, req.headers.get("stripe-signature"));
    if (!ok) return jsonError("invalid signature", 401);
    const event = JSON.parse(raw) as { type?: string; data?: { object?: StripeObj } };
    const obj = event.data?.object || {};
    const uidFromMeta = obj.metadata?.uid || obj.client_reference_id;
    const customerId = typeof obj.customer === "string" ? obj.customer : null;
    let uid = uidFromMeta || null;
    if (!uid && customerId) {
      const found = await findUserByStripeCustomerId(customerId);
      uid = found?.uid || null;
    }
    if (!uid) return NextResponse.json({ ok: true, ignored: true });

    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "invoice.paid"
    ) {
      const status = obj.status;
      const expired =
        status === "canceled" ||
        status === "unpaid" ||
        status === "incomplete_expired";
      await setStripeIds(uid, {
        stripeCustomerId: customerId,
        stripeSubscriptionId:
          obj.subscription || (event.type?.includes("subscription") ? obj.id : null),
        membership: expired ? "expired" : "subscriber",
      });
    }

    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "invoice.payment_failed"
    ) {
      const existing = await userRef(uid).get();
      const current = existing.data() as { membership?: string } | undefined;
      if (current?.membership !== "coaching_free") {
        await setStripeIds(uid, { membership: "expired" });
      }
    }

    return NextResponse.json({ ok: true });
  });
}
