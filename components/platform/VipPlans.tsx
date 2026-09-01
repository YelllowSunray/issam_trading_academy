"use client";

import { useState } from "react";
import { startCheckout } from "@/lib/journal/api-client";
import { VIP_PERKS, type VipPlan, type VipPlanId } from "@/lib/platform/plans";

export function VipPlans({
  plans,
  perks = VIP_PERKS,
  stripeReady,
  onError,
}: {
  plans: Array<VipPlan & { available?: boolean }>;
  perks?: string[];
  stripeReady: boolean;
  onError?: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<VipPlanId | null>(null);

  return (
    <div>
      <ul className="vip-perks">
        {perks.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="vip-grid">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`vip-card${plan.highlight ? " featured" : ""}`}
          >
            {plan.highlight ? <div className="vip-badge">Meest gekozen</div> : null}
            <div className="vip-label">{plan.label}</div>
            <div className="vip-price">
              {plan.priceLabel}
              <span>{plan.cadence}</span>
            </div>
            <button
              type="button"
              className="tb-addbtn"
              disabled={busy !== null}
              onClick={async () => {
                setBusy(plan.id);
                try {
                  const { url } = await startCheckout(plan.id);
                  window.location.href = url;
                } catch (e) {
                  onError?.(
                    stripeReady
                      ? e instanceof Error
                        ? e.message
                        : "Checkout mislukt"
                      : "Stripe is nog niet live. Vraag Issam om 1:1-toegang.",
                  );
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === plan.id ? "Bezig…" : "Word VIP"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
