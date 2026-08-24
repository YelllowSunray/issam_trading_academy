"use client";

import { useEffect, useState } from "react";
import { MemberPage } from "@/components/platform/MemberPage";
import { fetchCommunityInvite } from "@/lib/journal/api-client";

function CommunityInner() {
  const [invite, setInvite] = useState<{
    label: string;
    note: string;
    url: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunityInvite()
      .then(setInvite)
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, []);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">COMMUNITY</p>
      <h1 className="tj-title">{invite?.label || "Telegram"}</h1>
      <p className="pl-sub">
        {invite?.note ||
          "De academy-community draait op Telegram. Alleen leden zien de invite."}
      </p>
      {error && <div className="pl-empty">{error}</div>}
      <div className="tj-panel">
        {invite?.url ? (
          <>
            <p className="pl-sub2" style={{ marginBottom: 16 }}>
              Deze link is alleen voor leden. Deel hem niet publiek.
            </p>
            <a
              href={invite.url}
              target="_blank"
              rel="noreferrer"
              className="tb-addbtn"
              style={{ display: "inline-flex", textDecoration: "none" }}
            >
              Open Telegram-groep
            </a>
          </>
        ) : (
          <div className="pl-empty">
            Issam heeft de Telegram-invite nog niet ingesteld. Dat kan in Admin
            → Community.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <MemberPage>
      <CommunityInner />
    </MemberPage>
  );
}
