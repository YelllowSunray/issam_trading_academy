"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { CopyButton } from "@/components/ui/CopyButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { isActiveMembership, MEMBERSHIP_LABELS } from "@/lib/auth/membership";
import {
  confirmCheckout,
  fetchMt5SecretMeta,
  fetchMyCloudSync,
  openBillingPortal,
  rotateMt5Secret,
  startCheckout,
} from "@/lib/journal/api-client";

function SettingsInner() {
  const { profile, logout, updateDisplayName, refreshProfile } = useAuth();
  const [meta, setMeta] = useState<{
    configured: boolean;
    createdAt: string | null;
  } | null>(null);
  const [plainSecret, setPlainSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileInfo, setProfileInfo] = useState<string | null>(null);
  const [cloudAccounts, setCloudAccounts] = useState<
    Awaited<ReturnType<typeof fetchMyCloudSync>>["accounts"]
  >([]);
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const member = isActiveMembership(profile?.membership, profile?.role);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000";
  const tradeUrl = `${origin}/api/mt5-trade`;
  const heartbeatUrl = `${origin}/api/heartbeat`;

  useEffect(() => {
    setDisplayName(profile?.displayName || "");
  }, [profile?.displayName]);

  useEffect(() => {
    if (!member) return;
    fetchMt5SecretMeta()
      .then(setMeta)
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
    fetchMyCloudSync()
      .then((d) => setCloudAccounts(d.accounts))
      .catch(() => setCloudAccounts([]));
  }, [member]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "cancel") {
      setError("Checkout geannuleerd.");
      return;
    }
    if (params.get("checkout") !== "success") return;
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setProfileInfo("Betaling ontvangen. Vernieuw de pagina als toegang nog niet actief is.");
      return;
    }
    confirmCheckout(sessionId)
      .then(async () => {
        await refreshProfile();
        setProfileInfo("Abonnement actief. Je hebt nu het volledige platform.");
        window.history.replaceState({}, "", "/settings");
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Bevestigen van betaling mislukt"),
      );
  }, [refreshProfile]);

  async function handleRotate() {
    if (meta?.configured) {
      const ok = window.confirm(
        "Weet je zeker dat je het MT5-secret wilt roteren? De oude secret werkt daarna niet meer — update de EA.",
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await rotateMt5Secret();
      setPlainSecret(res.secret);
      setMeta({ configured: true, createdAt: res.createdAt });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setError(null);
    setProfileInfo(null);
    try {
      await updateDisplayName(displayName);
      setProfileInfo("Profiel opgeslagen.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setProfileBusy(false);
    }
  }

  return (
    <div className="journal-main">
      <PageHeader
        title="Profiel & instellingen"
        subtitle="Pas je naam aan, beheer lidmaatschap en MT5-koppeling."
        backHref="/journal"
        backLabel="← Platform"
      />

      <div className="tj-panel">
        <div className="ttl" style={{ marginBottom: 10 }}>
          LIDMAATSCHAP
        </div>
        <div className="status-chip" style={{ marginBottom: 12 }}>
          {profile ? MEMBERSHIP_LABELS[profile.membership] : "—"}
        </div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          1:1-klanten worden door Issam op coaching_free gezet. Platform-only
          leden betalen via Stripe.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="tb-addbtn"
            onClick={async () => {
              try {
                const { url } = await startCheckout();
                window.location.href = url;
              } catch (e) {
                setError(e instanceof Error ? e.message : "Checkout mislukt");
              }
            }}
          >
            Word lid / verlengen
          </button>
          <button
            type="button"
            className="pl-reset-btn"
            onClick={async () => {
              try {
                const { url } = await openBillingPortal();
                window.location.href = url;
              } catch (e) {
                setError(e instanceof Error ? e.message : "Portal mislukt");
              }
            }}
          >
            Stripe-portaal
          </button>
        </div>
      </div>

      <div className="tj-panel">
        <div className="ttl" style={{ marginBottom: 10 }}>
          PROFIEL
        </div>
        <form onSubmit={onSaveProfile}>
          <div className="tj-field">
            <div className="lbl">Naam</div>
            <input
              className="tj-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder="Jouw naam"
            />
            <div className="hint" style={{ marginTop: 6 }}>
              Dit is de naam die coaches en jijzelf in de app zien.
            </div>
          </div>
          <div className="tj-field">
            <div className="lbl">E-mail</div>
            <input
              className="tj-input"
              value={profile?.email || ""}
              disabled
              readOnly
            />
          </div>
          <div className="tj-field">
            <div className="lbl">Rol</div>
            <input
              className="tj-input"
              value={
                profile?.role === "admin" ? "Coach / admin" : "Student"
              }
              disabled
              readOnly
            />
          </div>
          {profileInfo && (
            <div className="pl-empty" style={{ marginBottom: 12 }}>
              {profileInfo}
            </div>
          )}
          <button className="tj-savebtn" type="submit" disabled={profileBusy}>
            {profileBusy ? "Opslaan…" : "Profiel opslaan"}
          </button>
        </form>
        <button
          type="button"
          className="pl-reset-btn"
          style={{ marginTop: 12, width: "100%" }}
          onClick={() => logout()}
        >
          Uitloggen
        </button>
      </div>

      {member && (
      <>
      {cloudAccounts.length > 0 && (
        <div className="tj-panel">
          <div className="ttl" style={{ marginBottom: 10 }}>
            CLOUD MT5
          </div>
          <p className="pl-sub2" style={{ marginBottom: 12 }}>
            Dit account synct via de academy-cloud. De EA is dan niet nodig
            op je telefoon.
          </p>
          {cloudAccounts.map((a) => (
            <div key={a.accountId} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>
                {a.login}
                {a.name ? ` · ${a.name}` : ""}
              </div>
              <div className="pl-sub2">
                {a.status}
                {a.lastSyncAt
                  ? ` · laatste sync ${new Date(a.lastSyncAt).toLocaleString("nl-NL")}`
                  : " · nog geen sync"}
              </div>
              {a.lastError ? (
                <div className="pl-sub2">{a.lastError}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div className="tj-panel">
        <div
          className="ttl"
          style={{
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          MT5 INGEST SECRET
          {meta && (
            <span className={`status-chip ${meta.configured ? "on" : "off"}`}>
              {meta.configured ? "Secret geconfigureerd" : "Nog niet geconfigureerd"}
            </span>
          )}
        </div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          Genereer een secret en plak die in de EA-input <code>IngestSecret</code>.
          Zonder secret worden trades niet geaccepteerd.
        </p>
        {meta?.configured && meta.createdAt && (
          <div className="pl-sub2" style={{ marginBottom: 12 }}>
            Laatst gegenereerd: {new Date(meta.createdAt).toLocaleString("nl-NL")}
          </div>
        )}
        {plainSecret && (
          <div className="pl-empty" style={{ marginBottom: 12 }}>
            Nieuw secret (één keer zichtbaar — kopieer nu):
            <div className="code-row">
              <code>{plainSecret}</code>
              <CopyButton value={plainSecret} />
            </div>
          </div>
        )}
        {error && (
          <div className="pl-empty" style={{ marginBottom: 12, color: "var(--bear)" }}>
            {error}
          </div>
        )}
        <button
          type="button"
          className="tb-addbtn"
          disabled={busy}
          onClick={() => void handleRotate()}
        >
          {busy ? "Genereren…" : meta?.configured ? "Secret roteren" : "Secret genereren"}
        </button>
      </div>

      <div className="tj-panel">
        <div className="ttl" style={{ marginBottom: 10 }}>
          EA SETUP
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--paper-dim)" }}>
          <div style={{ marginBottom: 10 }}>
            <div>TradeURL</div>
            <div className="code-row">
              <code>{tradeUrl}</code>
              <CopyButton value={tradeUrl} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div>HeartbeatURL</div>
            <div className="code-row">
              <code>{heartbeatUrl}</code>
              <CopyButton value={heartbeatUrl} />
            </div>
          </div>
          <div>
            <div>WebRequest allowlist in MT5</div>
            <div className="code-row">
              <code>{origin}</code>
              <CopyButton value={origin} />
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <PlatformShell>
        <SettingsInner />
      </PlatformShell>
    </RequireAuth>
  );
}
