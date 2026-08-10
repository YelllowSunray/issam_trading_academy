"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  fetchMt5SecretMeta,
  rotateMt5Secret,
} from "@/lib/journal/api-client";

function SettingsInner() {
  const { profile, logout } = useAuth();
  const [meta, setMeta] = useState<{
    configured: boolean;
    createdAt: string | null;
  } | null>(null);
  const [plainSecret, setPlainSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000";
  const tradeUrl = `${origin}/api/mt5-trade`;
  const heartbeatUrl = `${origin}/api/heartbeat`;

  useEffect(() => {
    fetchMt5SecretMeta()
      .then(setMeta)
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, []);

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

  return (
    <div className="journal-main">
      <PageHeader
        title="Instellingen"
        subtitle="Profiel, MT5 koppeling en EA-setup."
      />

      <div className="tj-panel">
        <div className="ttl" style={{ marginBottom: 10 }}>
          PROFIEL
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <div>
            <span style={{ color: "var(--paper-dim)" }}>Naam:</span>{" "}
            {profile?.displayName}
          </div>
          <div>
            <span style={{ color: "var(--paper-dim)" }}>E-mail:</span>{" "}
            {profile?.email}
          </div>
          <div>
            <span style={{ color: "var(--paper-dim)" }}>Rol:</span>{" "}
            {profile?.role}
          </div>
        </div>
        <button
          type="button"
          className="pl-reset-btn"
          style={{ marginTop: 14 }}
          onClick={() => logout()}
        >
          Uitloggen
        </button>
      </div>

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
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsInner />
    </RequireAuth>
  );
}
