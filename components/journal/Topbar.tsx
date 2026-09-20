"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { UserMenu } from "@/components/ui/UserMenu";
import { dateLocale } from "@/lib/i18n";
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
  embedded = false,
}: {
  page: "journal" | "dashboard" | "backtest";
  onPageChange: (page: "journal" | "dashboard" | "backtest") => void;
  accounts: Mt5AccountSummary[];
  selectedLogin: string | null;
  onSelectLogin: (login: string) => void;
  status: Mt5Status;
  onAddTrade: () => void;
  isAdmin?: boolean;
  coachName?: string | null;
  onClearAsUser?: () => void;
  readOnly?: boolean;
  embedded?: boolean;
}) {
  const { t, locale } = useI18n();
  const [clock, setClock] = useState("--:--:--");
  const [utcHour, setUtcHour] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtcHour(now.getUTCHours());
      setClock(
        new Intl.DateTimeFormat(dateLocale(locale), {
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
  }, [locale]);

  const activeSessions = TJ_SESSIONS.filter((s) => tjIsSessionActive(s, utcHour));
  const totalTrades = accounts.reduce((n, a) => n + (a.trade_count || 0), 0);
  const mt5Login =
    status.account?.login != null ? ` · #${status.account.login}` : "";

  return (
    <header className="topbar">
      <div className="tb-left">
        {!embedded && (
          <Link href="/" className="tb-brand" style={{ textDecoration: "none", color: "inherit" }}>
            Trade<span>chain</span>
          </Link>
        )}
        <div className="tb-tabs">
          <button
            type="button"
            className={`tb-tab${page === "journal" ? " active" : ""}`}
            onClick={() => onPageChange("journal")}
          >
            {t("nav.journal")}
          </button>
          <button
            type="button"
            className={`tb-tab${page === "dashboard" ? " active" : ""}`}
            onClick={() => onPageChange("dashboard")}
          >
            <span className="tb-label-full">{t("journal.pnlTitle")}</span>
            <span className="tb-label-short">{t("journal.pnlShort")}</span>
          </button>
          <button
            type="button"
            className={`tb-tab${page === "backtest" ? " active" : ""}`}
            onClick={() => onPageChange("backtest")}
          >
            {t("coach.backtest")}
          </button>
          <Link href="/tools" className="tb-tab">
            {t("nav.tools")}
          </Link>
          {!embedded && isAdmin && (
            <Link href="/admin" className="tb-tab">
              {t("journal.coaching")}
            </Link>
          )}
        </div>
      </div>
      <div className="tb-right">
        {readOnly && coachName && (
          <div className="tb-coach-chip">
            <span className="tb-coach-chip-label">{t("admin.coach")}</span>
            <span className="tb-coach-chip-name">{coachName}</span>
            <button type="button" className="pl-reset-btn" onClick={onClearAsUser}>
              {t("common.back")}
            </button>
          </div>
        )}
        <div className="tb-meta">
          {accounts.length > 0 && (
            <select
              className="mt5-account-select"
              value={selectedLogin || ""}
              onChange={(e) => onSelectLogin(e.target.value)}
            >
              <option value="">
                {t("journal.allAccounts", { n: totalTrades })}
              </option>
              {accounts.map((a) => (
                <option key={a.login} value={a.login}>
                  #{a.login}
                  {a.balance != null
                    ? ` · ${fmtEurAbs(a.balance)}${a.currency ? ` ${a.currency}` : ""}`
                    : ""}
                  {a.trade_count != null ? ` · ${a.trade_count} ${t("common.trades")}` : ""}
                  {a.connected ? "" : t("journal.offline")}
                </option>
              ))}
            </select>
          )}
          <div className="mt5-status">
            <span className={`mt5-dot${status.connected ? " on" : ""}`} />
            <span className="tb-label-full">
              {status.connected
                ? t("journal.mt5On", { login: mt5Login })
                : t("journal.mt5Off")}
            </span>
            <span className="tb-label-short">
              {status.connected ? t("journal.mt5Online") : t("journal.mt5Offline")}
            </span>
          </div>
          <div className="tb-clock">
            <div className="lbl">AMSTERDAM</div>
            <div className="val">{clock}</div>
          </div>
          <div className="tb-sessions" title={t("journal.activeSessions")}>
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
                {t("journal.noSession")}
              </div>
            )}
          </div>
        </div>
        <div className="tb-actions">
          {!readOnly && (
            <button className="tb-addbtn" type="button" onClick={onAddTrade}>
              <IconPlus />
              <span className="tb-label-full">{t("journal.addTrade")}</span>
              <span className="tb-label-short">{t("journal.addShort")}</span>
            </button>
          )}
          <LanguageSwitcher />
          {!embedded && <UserMenu isAdmin={isAdmin} />}
        </div>
      </div>
    </header>
  );
}
