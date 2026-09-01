"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
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
  const readOnly = Boolean(asUser && asUser !== profile?.uid);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchCommunityInvite()
      .then(setInvite)
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, []);

  useEffect(() => {
    load();
  }, [load, asUser]);

  const channel = invite?.publicChannel || VIP_PUBLIC_CHANNEL;

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">COMMUNITY</p>
      <h1 className="tj-title">{invite?.label || "Telegram"}</h1>
      <p className="pl-sub">
        {invite?.note ||
          "Geen eigen chat in de app. Koppel Telegram; de bot maakt een persoonlijke invite naar de juiste groep."}
      </p>
      {error && <div className="pl-empty">{error}</div>}

      <div className="tj-panel" style={{ marginBottom: 16 }}>
        <div className="ttl">Publieke channel</div>
        <p className="pl-sub2" style={{ margin: "8px 0 12px" }}>
          Volg updates op de open channel — dat is geen vervanging van de
          leden-groep.
        </p>
        <a
          href={channel}
          target="_blank"
          rel="noreferrer"
          className="tb-addbtn"
          style={{ textDecoration: "none" }}
        >
          Open @tradingacadamyy
        </a>
      </div>

      <div className="tj-panel">
        <div className="ttl">Jouw groep</div>
        <p className="pl-sub2" style={{ margin: "8px 0 12px" }}>
          {invite?.linked
            ? `Gekoppeld als @${invite.telegramUsername || "telegram"} · ${invite.tier === "vip" ? "VIP" : "normaal"}`
            : "Eerst Telegram Login, daarna een eenmalige invite (24 uur, 1 persoon)."}
        </p>
        {!readOnly && !invite?.linked && invite?.botUsername ? (
          <TelegramLogin
            botUsername={invite.botUsername}
            onLinked={load}
            onError={setError}
          />
        ) : null}
        {readOnly && !invite?.linked ? (
          <p className="pl-sub2">Deze student heeft Telegram nog niet gekoppeld.</p>
        ) : null}
        {invite?.url ? (
          <a
            href={invite.url}
            target="_blank"
            rel="noreferrer"
            className="tb-addbtn"
            style={{ display: "inline-flex", textDecoration: "none", marginTop: 12 }}
          >
            Open jouw {invite.tier === "vip" ? "VIP-" : ""}groep
          </a>
        ) : invite?.linked ? (
          <div className="pl-empty" style={{ marginTop: 12 }}>
            Invite nog niet klaar. Zet chat-IDs in Admin → Community en maak de
            bot admin in beide groepen.
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
