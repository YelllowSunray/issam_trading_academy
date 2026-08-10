"use client";

import { useEffect, useState } from "react";
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
}: {
  page: "journal" | "dashboard";
  onPageChange: (page: "journal" | "dashboard") => void;
  accounts: Mt5AccountSummary[];
  selectedLogin: string | null;
  onSelectLogin: (login: string) => void;
  status: Mt5Status;
  onAddTrade: () => void;
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

  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="tb-brand">
          Trading<span>Acadamy</span>
        </div>
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
            P&amp;L Dashboard
          </button>
        </div>
      </div>
      <div className="tb-right">
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
          {status.connected
            ? `MT5 verbonden${status.account?.login != null ? ` · #${status.account.login}` : ""}`
            : "MT5 niet verbonden"}
        </div>
        <div className="tb-clock">
          <div className="lbl">AMSTERDAM</div>
          <div className="val">{clock}</div>
        </div>
        <div className="tb-sessions">
          {TJ_SESSIONS.map((s) => {
            const active = tjIsSessionActive(s, utcHour);
            return (
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
                  border: `1px solid ${active ? s.color : "var(--line)"}`,
                  background: active ? "var(--ink-2)" : undefined,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: active ? s.color : "#565a63",
                    boxShadow: active ? `0 0 6px ${s.color}` : undefined,
                  }}
                />
                <div
                  style={{
                    fontSize: 8.5,
                    color: active ? "var(--paper)" : "#565a63",
                  }}
                >
                  {s.name}
                </div>
              </div>
            );
          })}
        </div>
        <button className="tb-addbtn" type="button" onClick={onAddTrade}>
          <IconPlus /> Trade toevoegen
        </button>
      </div>
    </header>
  );
}
