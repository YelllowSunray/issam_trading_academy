"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import { AuthPage } from "@/components/platform/AuthPage";
import { TelegramLogin } from "@/components/platform/TelegramLogin";
import { fetchCommunityInvite } from "@/lib/journal/api-client";
import { VIP_PUBLIC_CHANNEL } from "@/lib/platform/plans";

type Invite = {
  label: string;
  note: string;
  url: string | null;
  tier: "vip" | "normal";
  linked: boolean;
  telegramUsername: string | null;
  publicChannel: string;
  botUsername: string | null;
  expiresAt: string | null;
};

function CommunityInner() {
  const { profile, asUser } = useAuth();
  const t = useT();
  const readOnly = Boolean(asUser && asUser !== profile?.uid);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchCommunityInvite()
      .then(setInvite)
      .catch((e) => setError(e instanceof Error ? e.message : t("common.loadFailed")));
  }, [t]);

  useEffect(() => {
    load();
  }, [load, asUser]);

  const channel = invite?.publicChannel || VIP_PUBLIC_CHANNEL;

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">{t("community.eyebrow")}</p>
      <h1 className="tj-title">{invite?.label || "Telegram"}</h1>
      <p className="pl-sub">
        {invite?.note || t("community.defaultNote")}
      </p>
      {error && <div className="pl-empty">{error}</div>}

      <div className="tj-panel" style={{ marginBottom: 16 }}>
        <div className="ttl">{t("community.publicChannel")}</div>
        <p className="pl-sub2" style={{ margin: "8px 0 12px" }}>
          {t("community.publicLead")}
        </p>
        <a
          href={channel}
          target="_blank"
          rel="noreferrer"
          className="tb-addbtn"
          style={{ textDecoration: "none" }}
        >
          {t("community.openPublic")}
        </a>
      </div>

      <div className="tj-panel">
        <div className="ttl">{t("community.yourGroup")}</div>
        <p className="pl-sub2" style={{ margin: "8px 0 12px" }}>
          {invite?.linked
            ? t("community.linkedAs", {
                user: invite.telegramUsername || "telegram",
                tier: invite.tier === "vip" ? t("dashboard.vipGroup") : t("dashboard.normalGroup"),
              })
            : t("community.firstLogin")}
        </p>
        {!readOnly && !invite?.linked && invite?.botUsername ? (
          <TelegramLogin
            botUsername={invite.botUsername}
            onLinked={load}
            onError={setError}
          />
        ) : null}
        {readOnly && !invite?.linked ? (
          <p className="pl-sub2">{t("community.notLinked")}</p>
        ) : null}
        {invite?.url ? (
          <a
            href={invite.url}
            target="_blank"
            rel="noreferrer"
            className="tb-addbtn"
            style={{ display: "inline-flex", textDecoration: "none", marginTop: 12 }}
          >
            {t("community.openGroup", {
              tier: invite.tier === "vip" ? t("community.vipPrefix") : "",
            })}
          </a>
        ) : invite?.linked ? (
          <div className="pl-empty" style={{ marginTop: 12 }}>
            {t("community.invitePending")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <AuthPage>
      <CommunityInner />
    </AuthPage>
  );
}
