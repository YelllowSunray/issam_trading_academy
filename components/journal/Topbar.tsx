"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserMenu } from "@/components/ui/UserMenu";
import { TJ_SESSIONS } from "@/lib/journal/constants";
import { tjIsSessionActive } from "@/lib/journal/compute";
import { fmtEurAbs } from "@/lib/journal/format";
import type { Mt5AccountSummary, Mt5Status } from "@/lib/journal/types";
import { IconPlus } from "./icons";

export function Topbar({
  page,
  onPageChange,
  accounts,
  selectedLogin,
  onSelectLogin,
  status,
  onAddTrade,
  isAdmin,
  coachName,
  onClearAsUser,
  readOnly,
}: {
  page: "journal" | "dashboard";
  onPageChange: (page: "journal" | "dashboard") => void;
  accounts: Mt5AccountSummary[];
  selectedLogin: string | null;
  onSelectLogin: (login: string) => void;
  status: Mt5Status;
  onAddTrade: () => void;
  isAdmin?: boolean;
  coachName?: string | null;
  onClearAsUser?: () => void;
  readOnly?: boolean;
}) {
  const [clock, setClock] = useState("--:--:--");
  const [utcHour, setUtcHour] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtcHour(now.getUTCHours());
      setClock(
        new Intl.DateTimeFormat("nl-NL", {
          timeZone: "Europe/Amsterdam",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(now),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const activeSessions = TJ_SESSIONS.filter((s) => tjIsSessionActive(s, utcHour));

  return (
    <header className="topbar">
      <div className="tb-left">
        <Link href="/" className="tb-brand" style={{ textDecoration: "none", color: "inherit" }}>
          Trading<span>Acadamy</span>
        </Link>
        <div className="tb-tabs">
          <button
            type="button"
            className={`tb-tab${page === "journal" ? " active" : ""}`}
            onClick={() => onPageChange("journal")}
          >
            Journal
          </button>
          <button
            type="button"
            className={`tb-tab${page === "dashboard" ? " active" : ""}`}
            onClick={() => onPageChange("dashboard")}
          >
            <span className="tb-label-full">P&amp;L Dashboard</span>
            <span className="tb-label-short">P&amp;L</span>
          </button>
          {isAdmin && (
            <Link href="/admin" className="tb-tab">
              Coaching
            </Link>
          )}
        </div>
      </div>
      <div className="tb-right">
        {readOnly && coachName && (
          <div className="tb-coach-chip">
            <span className="tb-coach-chip-label">Coach-view</span>
            <span className="tb-coach-chip-name">{coachName}</span>
            <button type="button" className="pl-reset-btn" onClick={onClearAsUser}>
              Terug
            </button>
          </div>
        )}
        <div className="tb-meta">
          {accounts.length > 0 && (
            <select
              className="mt5-account-select"
              value={selectedLogin || accounts[0]?.login || ""}
              onChange={(e) => onSelectLogin(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.login} value={a.login}>
                  #{a.login}
                  {a.balance != null
                    ? ` · ${fmtEurAbs(a.balance)}${a.currency ? ` ${a.currency}` : ""}`
                    : ""}
                  {a.connected ? "" : " (offline)"}
                </option>
              ))}
            </select>
          )}
          <div className="mt5-status">
            <span className={`mt5-dot${status.connected ? " on" : ""}`} />
            <span className="tb-label-full">
              {status.connected
                ? `MT5 verbonden${status.account?.login != null ? ` · #${status.account.login}` : ""}`
                : "MT5 niet verbonden"}
            </span>
            <span className="tb-label-short">
              {status.connected ? "MT5 online" : "MT5 offline"}
            </span>
          </div>
          <div className="tb-clock">
            <div className="lbl">AMSTERDAM</div>
            <div className="val">{clock}</div>
          </div>
          <div className="tb-sessions" title="Actieve sessies">
            {activeSessions.length ? (
              activeSessions.map((s) => (
                <div
                  key={s.name}
                  title={s.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    padding: "5px 7px",
                    borderRadius: 6,
                    border: `1px solid ${s.color}`,
                    background: "var(--ink-2)",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: s.color,
                      boxShadow: `0 0 6px ${s.color}`,
                    }}
                  />
                  <div style={{ fontSize: 8.5, color: "var(--paper)" }}>{s.name}</div>
                </div>
              ))
            ) : (
              <div
                style={{
                  fontSize: 10,
                  color: "#565a63",
                  padding: "5px 7px",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                }}
              >
                Geen sessie
              </div>
            )}
          </div>
        </div>
        <div className="tb-actions">
          {!readOnly && (
            <button className="tb-addbtn" type="button" onClick={onAddTrade}>
              <IconPlus />
              <span className="tb-label-full">Trade toevoegen</span>
              <span className="tb-label-short">Toevoegen</span>
            </button>
          )}
          <UserMenu isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
