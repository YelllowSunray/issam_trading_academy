"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipPlans } from "@/components/platform/VipPlans";
import { MEMBERSHIP_LABELS } from "@/lib/auth/membership";
import { fetchPublicPricing } from "@/lib/journal/api-client";
import { VIP_PERKS, VIP_PLANS, type VipPlan } from "@/lib/platform/plans";

export function MembershipGate() {
  const { profile, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [coachingNote, setCoachingNote] = useState(
    "Inbegrepen bij 1:1 coaching. Prijs spreek je met Issam af.",
  );
  const [stripeReady, setStripeReady] = useState(false);
  const [perks, setPerks] = useState(VIP_PERKS);
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

  return (
    <div className="plat-gate plat-gate-wide">
      <p className="tj-eyebrow">VIP</p>
      <h1 className="tj-title">Toegang nodig</h1>
      <p className="pl-sub">
        Kies een VIP-pakket of vraag Issam om 1:1-coaching. Geen automatische
        trade-executie.
      </p>
      <div className="tj-panel" style={{ marginBottom: 18 }}>
        <div className="ttl">1:1 coaching</div>
        <p className="pl-sub2">{coachingNote}</p>
      </div>
      <VipPlans
        plans={plans}
        perks={perks}
        stripeReady={stripeReady}
        onError={setError}
      />
      <div className="status-chip" style={{ margin: "18px 0" }}>
        Jouw status: {MEMBERSHIP_LABELS[status]}
      </div>
      {error && (
        <div className="pl-empty" style={{ marginBottom: 14, color: "var(--bear)" }}>
          {error}
        </div>
      )}
      <div className="plat-gate-actions">
        <Link href="/settings" className="pl-reset-btn">
          Instellingen
        </Link>
        <Link href="/" className="pl-reset-btn">
          Terug naar homepage
        </Link>
        <button type="button" className="pl-reset-btn" onClick={() => void logout()}>
          Uitloggen
        </button>
      </div>
    </div>
  );
}
