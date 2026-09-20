"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
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
  const t = useT();
  const [busy, setBusy] = useState<VipPlanId | null>(null);
  const shownPerks = perks.length
    ? perks
    : [
        t("vip.perkCalls"),
        t("vip.perkAnalyses"),
        t("vip.perkGroup"),
        t("vip.perkTelegram"),
        t("vip.perkAcademy"),
        t("vip.perkJournal"),
      ];

  return (
    <div>
      <ul className="vip-perks">
        {shownPerks.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="vip-grid">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`vip-card${plan.highlight ? " featured" : ""}`}
          >
            {plan.highlight ? <div className="vip-badge">{t("vip.mostChosen")}</div> : null}
            <div className="vip-label">{t(`vip.${plan.id}Label`)}</div>
            <div className="vip-price">
              {plan.priceLabel}
              <span>{t(`vip.${plan.id}Cadence`)}</span>
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
                        : t("vip.checkoutFailed")
                      : t("vip.stripeNotLive"),
                  );
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === plan.id ? t("common.busy") : t("vip.becomeVip")}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
