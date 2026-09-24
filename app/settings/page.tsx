"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PageHeader } from "@/components/ui/PageHeader";
import { isActiveMembership } from "@/lib/auth/membership";
import { dateLocale } from "@/lib/i18n";
import {
  confirmCheckout,
  connectMyCloudAccount,
  fetchMyCloudSync,
  openBillingPortal,
  fetchPublicPricing,
} from "@/lib/journal/api-client";
import { VipPlans } from "@/components/platform/VipPlans";
import { VIP_PLANS, type VipPlan } from "@/lib/platform/plans";

function SettingsInner() {
  const { profile, logout, updateDisplayName, refreshProfile } = useAuth();
  const { t, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [profileInfo, setProfileInfo] = useState<string | null>(null);
  const [cloudAccounts, setCloudAccounts] = useState<
    Awaited<ReturnType<typeof fetchMyCloudSync>>["accounts"]
  >([]);
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [mt5Login, setMt5Login] = useState("");
  const [mt5Server, setMt5Server] = useState("");
  const [mt5Password, setMt5Password] = useState("");
  const [mt5Name, setMt5Name] = useState("");
  const [mt5Platform, setMt5Platform] = useState<"Metatrader 5" | "Metatrader 4">(
    "Metatrader 5",
  );
  const [plans, setPlans] = useState<Array<VipPlan & { available?: boolean }>>(
    VIP_PLANS,
  );
  const [stripeReady, setStripeReady] = useState(false);
  const member = isActiveMembership(profile?.membership, profile?.role);

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
    fetchMyCloudSync()
      .then((d) => setCloudAccounts(d.accounts || []))
      .catch(() => setCloudAccounts([]));
  }, [member]);

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

  async function onConnectCloud(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setProfileInfo(null);
    try {
      const res = await connectMyCloudAccount({
        login: mt5Login,
        password: mt5Password,
        server: mt5Server,
        name: mt5Name.trim() || undefined,
        platform: mt5Platform,
      });
      setMt5Password("");
      if (!res.result.ok) {
        throw new Error(res.result.error || t("admin.linkFailed"));
      }
      setMt5Login("");
      setMt5Server("");
      setMt5Name("");
      setProfileInfo(t("settings.cloudAdded"));
      const next = await fetchMyCloudSync();
      setCloudAccounts(next.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.failed"));
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

      {error && (
        <div className="pl-empty" style={{ marginBottom: 12, color: "var(--bear)" }}>
          {error}
        </div>
      )}

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
        <div className="tj-panel">
          <div className="ttl" style={{ marginBottom: 10 }}>
            {t("settings.cloudMt5")}
          </div>
          <p className="pl-sub2" style={{ marginBottom: 12 }}>
            {t("settings.cloudLead")}
          </p>
          {cloudAccounts.length ? (
            cloudAccounts.map((a) => (
              <div key={a.accountId} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>
                  {a.login}
                  {a.name ? ` · ${a.name}` : ""}
                  {a.server ? ` · ${a.server}` : ""}
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
            ))
          ) : (
            <p className="pl-sub2" style={{ marginBottom: 12 }}>
              {t("settings.cloudNoAccounts")}
            </p>
          )}
          <form onSubmit={(e) => void onConnectCloud(e)}>
            <div className="tj-field">
              <div className="lbl">{t("settings.cloudLogin")}</div>
              <input
                className="tj-input"
                value={mt5Login}
                onChange={(e) => setMt5Login(e.target.value)}
                placeholder="24615704"
                required
                autoComplete="off"
              />
            </div>
            <div className="tj-field">
              <div className="lbl">{t("settings.cloudServer")}</div>
              <input
                className="tj-input"
                value={mt5Server}
                onChange={(e) => setMt5Server(e.target.value)}
                placeholder={t("settings.cloudServerHint")}
                required
                autoComplete="off"
              />
            </div>
            <div className="tj-field">
              <div className="lbl">{t("settings.cloudPassword")}</div>
              <input
                className="tj-input"
                type="password"
                value={mt5Password}
                onChange={(e) => setMt5Password(e.target.value)}
                placeholder={t("admin.investorHint")}
                required
                autoComplete="new-password"
              />
              <div className="hint" style={{ marginTop: 6 }}>
                {t("settings.cloudPasswordHint")}
              </div>
            </div>
            <div className="tj-field">
              <div className="lbl">{t("settings.cloudPlatform")}</div>
              <select
                className="tj-input"
                value={mt5Platform}
                onChange={(e) =>
                  setMt5Platform(e.target.value as "Metatrader 5" | "Metatrader 4")
                }
              >
                <option value="Metatrader 5">MetaTrader 5</option>
                <option value="Metatrader 4">MetaTrader 4</option>
              </select>
            </div>
            <div className="tj-field">
              <div className="lbl">{t("settings.cloudName")}</div>
              <input
                className="tj-input"
                value={mt5Name}
                onChange={(e) => setMt5Name(e.target.value)}
                placeholder={t("settings.cloudNamePlaceholder")}
                autoComplete="off"
              />
            </div>
            <button className="tb-addbtn" type="submit" disabled={busy}>
              {busy ? t("settings.cloudAdding") : t("settings.cloudAdd")}
            </button>
          </form>
        </div>
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
