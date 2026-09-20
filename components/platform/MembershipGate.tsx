"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipPlans } from "@/components/platform/VipPlans";
import { useT } from "@/components/i18n/LocaleProvider";
import { fetchPublicPricing } from "@/lib/journal/api-client";
import { VIP_PLANS, type VipPlan } from "@/lib/platform/plans";

export function MembershipGate() {
  const { profile, logout } = useAuth();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [coachingNote, setCoachingNote] = useState(t("gate.coachingNote"));
  const [stripeReady, setStripeReady] = useState(false);
  const [perks, setPerks] = useState<string[]>([]);
  const [plans, setPlans] = useState<Array<VipPlan & { available?: boolean }>>(
    VIP_PLANS,
  );
  const status = profile?.membership || "none";

  useEffect(() => {
    fetchPublicPricing()
      .then((p) => {
        if (p.coachingPriceNote) setCoachingNote(p.coachingPriceNote);
        setStripeReady(p.stripeEnabled);
        if (p.perks?.length) setPerks(p.perks);
        if (p.plans?.length) setPlans(p.plans);
      })
      .catch(() => {});
  }, []);

  const localizedPerks = perks.length
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
    <div className="plat-gate plat-gate-wide">
      <p className="tj-eyebrow">VIP</p>
      <h1 className="tj-title">{t("gate.title")}</h1>
      <p className="pl-sub">{t("gate.lead")}</p>
      <div className="tj-panel" style={{ marginBottom: 18 }}>
        <div className="ttl">{t("gate.coaching")}</div>
        <p className="pl-sub2">{coachingNote}</p>
      </div>
      <VipPlans
        plans={plans}
        perks={localizedPerks}
        stripeReady={stripeReady}
        onError={setError}
      />
      <div className="status-chip" style={{ margin: "18px 0" }}>
        {t("gate.yourStatus", { status: t(`membership.${status}`) })}
      </div>
      {error && (
        <div className="pl-empty" style={{ marginBottom: 14, color: "var(--bear)" }}>
          {error}
        </div>
      )}
      <div className="plat-gate-actions">
        <Link href="/settings" className="pl-reset-btn">
          {t("common.settings")}
        </Link>
        <Link href="/" className="pl-reset-btn">
          {t("gate.backHome")}
        </Link>
        <button type="button" className="pl-reset-btn" onClick={() => void logout()}>
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
