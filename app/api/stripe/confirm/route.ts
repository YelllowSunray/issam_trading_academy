import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { retrieveCheckoutSession } from "@/lib/stripe/server";
import { setStripeIds } from "@/lib/users/store";

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req, { allowWithoutMembership: true });
    const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) return jsonError("sessionId ontbreekt");

    const session = await retrieveCheckoutSession(sessionId);
    const meta = session.metadata as { uid?: string } | undefined;
    const uid =
      meta?.uid ||
      (typeof session.client_reference_id === "string"
        ? session.client_reference_id
        : null);
    if (uid !== user.uid) return jsonError("session hoort niet bij dit account", 403);

    const paid =
      session.payment_status === "paid" ||
      session.status === "complete" ||
      session.status === "open";
    if (!paid && session.status !== "complete") {
      return jsonError("Betaling nog niet afgerond", 400);
    }

    const customerId =
      typeof session.customer === "string" ? session.customer : null;
    const sub = session.subscription;
    const subscriptionId =
      typeof sub === "string"
        ? sub
        : sub && typeof sub === "object" && "id" in sub
          ? String((sub as { id: string }).id)
          : null;

    await setStripeIds(user.uid, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      membership: "subscriber",
    });

    return NextResponse.json({ ok: true, membership: "subscriber" });
  });
}
