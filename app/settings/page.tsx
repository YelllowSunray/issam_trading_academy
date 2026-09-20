"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { CopyButton } from "@/components/ui/CopyButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { isActiveMembership } from "@/lib/auth/membership";
import { dateLocale } from "@/lib/i18n";
import {
  confirmCheckout,
  fetchMt5SecretMeta,
  fetchMyCloudSync,
  openBillingPortal,
  rotateMt5Secret,
  fetchPublicPricing,
} from "@/lib/journal/api-client";
import { VipPlans } from "@/components/platform/VipPlans";
import { VIP_PLANS, type VipPlan } from "@/lib/platform/plans";

function SettingsInner() {
  const { profile, logout, updateDisplayName, refreshProfile } = useAuth();
  const { t, locale } = useI18n();
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
  const [plans, setPlans] = useState<Array<VipPlan & { available?: boolean }>>(
    VIP_PLANS,
  );
  const [stripeReady, setStripeReady] = useState(false);
  const member = isActiveMembership(profile?.membership, profile?.role);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000";
  const tradeUrl = `${origin}/api/mt5-trade`;
  const heartbeatUrl = `${origin}/api/heartbeat`;

  useEffect(() => {
    setDisplayName(profile?.displayName || "");
  }, [profile?.displayName]);

  useEffect(() => {
    fetchPublicPricing()
      .then((p) => {
        setStripeReady(p.stripeEnabled);
        if (p.plans?.length) setPlans(p.plans);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!member) return;
    fetchMt5SecretMeta()
      .then(setMeta)
      .catch((e) => setError(e instanceof Error ? e.message : t("common.loadFailed")));
    fetchMyCloudSync()
      .then((d) => setCloudAccounts(d.accounts))
      .catch(() => setCloudAccounts([]));
  }, [member, t]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "cancel") {
      setError(t("settings.checkoutCancel"));
      return;
    }
    if (params.get("checkout") !== "success") return;
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setProfileInfo(t("settings.paymentReceived"));
      return;
    }
    confirmCheckout(sessionId)
      .then(async () => {
        await refreshProfile();
        setProfileInfo(t("settings.subscriptionActive"));
        window.history.replaceState({}, "", "/settings");
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : t("settings.confirmFailed")),
      );
    // t is read for checkout query params on mount; avoid re-confirming on locale change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshProfile]);

  async function handleRotate() {
    if (meta?.configured) {
      const ok = window.confirm(t("settings.rotateConfirm"));
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await rotateMt5Secret();
      setPlainSecret(res.secret);
      setMeta({ configured: true, createdAt: res.createdAt });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.failed"));
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
      setProfileInfo(t("settings.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.saveFailed"));
    } finally {
      setProfileBusy(false);
    }
  }

  return (
    <div className="journal-main">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        backHref="/dashboard"
        backLabel={t("settings.back")}
      />

      <div className="tj-panel">
        <div className="ttl" style={{ marginBottom: 10 }}>
          {t("settings.membership")}
        </div>
        <div className="status-chip" style={{ marginBottom: 12 }}>
          {profile ? t(`membership.${profile.membership}`) : "—"}
        </div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          {t("settings.membershipLead")}
        </p>
        <VipPlans
          plans={plans}
          stripeReady={stripeReady}
          onError={setError}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button
            type="button"
            className="pl-reset-btn"
            onClick={async () => {
              try {
                const { url } = await openBillingPortal();
                window.location.href = url;
              } catch (e) {
                setError(e instanceof Error ? e.message : t("settings.portalFailed"));
              }
            }}
          >
            {t("settings.stripePortal")}
          </button>
        </div>
      </div>

      <div className="tj-panel">
        <div className="ttl" style={{ marginBottom: 10 }}>
          {t("settings.profile")}
        </div>
        <form onSubmit={onSaveProfile}>
          <div className="tj-field">
            <div className="lbl">{t("common.name")}</div>
            <input
              className="tj-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder={t("settings.namePlaceholder")}
            />
            <div className="hint" style={{ marginTop: 6 }}>
              {t("settings.nameHint")}
            </div>
          </div>
          <div className="tj-field">
            <div className="lbl">{t("common.email")}</div>
            <input
              className="tj-input"
              value={profile?.email || ""}
              disabled
              readOnly
            />
          </div>
          <div className="tj-field">
            <div className="lbl">{t("common.role")}</div>
            <input
              className="tj-input"
              value={
                profile?.role === "admin" ? t("common.coachAdmin") : t("common.student")
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
            {profileBusy ? t("common.saving") : t("settings.saveProfile")}
          </button>
        </form>
        <button
          type="button"
          className="pl-reset-btn"
          style={{ marginTop: 12, width: "100%" }}
          onClick={() => logout()}
        >
          {t("common.logout")}
        </button>
      </div>

      <div className="tj-panel">
        <div className="ttl" style={{ marginBottom: 10 }}>
          {t("settings.language")}
        </div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          {t("settings.languageLead")}
        </p>
        <LanguageSwitcher />
      </div>

      {member && (
      <>
      {cloudAccounts.length > 0 && (
        <div className="tj-panel">
          <div className="ttl" style={{ marginBottom: 10 }}>
            {t("settings.cloudMt5")}
          </div>
          <p className="pl-sub2" style={{ marginBottom: 12 }}>
            {t("settings.cloudLead")}
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
                  ? t("settings.lastSync", {
                      when: new Date(a.lastSyncAt).toLocaleString(dateLocale(locale)),
                    })
                  : t("settings.noSync")}
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
              {meta.configured ? t("settings.secretConfigured") : t("settings.secretMissing")}
            </span>
          )}
        </div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          {t("settings.secretLead")}
        </p>
        {meta?.configured && meta.createdAt && (
          <div className="pl-sub2" style={{ marginBottom: 12 }}>
            {t("settings.lastGenerated", {
              when: new Date(meta.createdAt).toLocaleString(dateLocale(locale)),
            })}
          </div>
        )}
        {plainSecret && (
          <div className="pl-empty" style={{ marginBottom: 12 }}>
            {t("settings.newSecret")}
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
          {busy
            ? t("settings.generating")
            : meta?.configured
              ? t("settings.rotate")
              : t("settings.generate")}
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
