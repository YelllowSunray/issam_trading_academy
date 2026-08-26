"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { MEMBERSHIP_LABELS } from "@/lib/auth/membership";
import { fetchPublicPricing, startCheckout } from "@/lib/journal/api-client";

export function MembershipGate() {
  const { profile, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState("€49 / maand");
  const [coachingNote, setCoachingNote] = useState(
    "Inbegrepen bij 1:1 coaching. Prijs spreek je met Issam af.",
  );
  const [stripeReady, setStripeReady] = useState(false);
  const status = profile?.membership || "none";

  useEffect(() => {
    fetchPublicPricing()
      .then((p) => {
        if (p.subscriberPriceLabel) setPrice(p.subscriberPriceLabel);
        if (p.coachingPriceNote) setCoachingNote(p.coachingPriceNote);
        setStripeReady(p.stripeEnabled);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="plat-gate">
      <p className="tj-eyebrow">LIDMAATSCHAP</p>
      <h1 className="tj-title">Toegang nodig</h1>
      <p className="pl-sub">
        Twee manieren, hetzelfde platform: 1:1 via Issam, of zelf een
        maandabonnement.
      </p>
      <div className="pl-two-col" style={{ marginBottom: 18 }}>
        <div className="tj-panel">
          <div className="ttl">1:1 coaching</div>
          <p className="pl-sub2">{coachingNote}</p>
        </div>
        <div className="tj-panel">
          <div className="ttl">Platform-lid</div>
          <div className="pl-value" style={{ margin: "8px 0" }}>
            {price}
          </div>
          <p className="pl-sub2">Home, markets, crypto en tools — alles.</p>
        </div>
      </div>
      <div className="status-chip" style={{ marginBottom: 18 }}>
        Jouw status: {MEMBERSHIP_LABELS[status]}
      </div>
      {error && (
        <div className="pl-empty" style={{ marginBottom: 14, color: "var(--bear)" }}>
          {error}
        </div>
      )}
      <div className="plat-gate-actions">
        <button
          type="button"
          className="tb-addbtn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const { url } = await startCheckout();
              window.location.href = url;
            } catch (e) {
              setError(
                stripeReady
                  ? e instanceof Error
                    ? e.message
                    : "Checkout mislukt"
                  : "Stripe is nog niet live. Vraag Issam om 1:1-toegang.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Bezig…" : `Word lid · ${price}`}
        </button>
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
