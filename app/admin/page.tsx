"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  fetchAdminUsers,
  fetchBillingStatus,
  setAdminUserDisabled,
  setBillingExceeded,
  type BillingLockInfo,
} from "@/lib/journal/api-client";
import { hardReplace } from "@/lib/navigation";
import type { UserProfile } from "@/lib/auth/types";

function formatRelativeActivity(iso: string | null | undefined): string {
  if (!iso) return "Nog geen journal-activiteit";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Onbekend";
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Zojuist";
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} u geleden`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} d geleden`;
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function activityFreshness(iso: string | null | undefined): "hot" | "warm" | "cold" {
  if (!iso) return "cold";
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (hours < 24) return "hot";
  if (hours < 72) return "warm";
  return "cold";
}

function CoachingInner() {
  const { profile, setCoachTarget } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [billing, setBilling] = useState<BillingLockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [showSystem, setShowSystem] = useState(false);

  useEffect(() => {
    if (profile && profile.role !== "admin") {
      hardReplace("/journal");
      return;
    }
    Promise.all([fetchAdminUsers(), fetchBillingStatus()])
      .then(([u, b]) => {
        setUsers(u);
        setBilling(b);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, [profile]);

  const students = useMemo(
    () => users.filter((u) => u.role === "student"),
    [users],
  );

  // Keep admins visible too, but students first / activity sorted already from API
  const rows = useMemo(() => {
    const me = users.filter((u) => u.uid === profile?.uid);
    const others = users.filter((u) => u.uid !== profile?.uid);
    return [...others, ...me];
  }, [users, profile?.uid]);

  if (profile && profile.role !== "admin") return null;

  const percent = billing?.usage?.percentUsed ?? 0;
  const meterCls =
    percent >= 100 || billing?.exceeded
      ? "danger"
      : percent >= 80
        ? "warn"
        : "";

  const recentCount = students.filter(
    (u) => activityFreshness(u.lastJournalActivityAt) === "hot",
  ).length;

  return (
    <div className="journal-main">
      <PageHeader
        title="Coaching"
        subtitle="Bekijk de journals van je studenten, zie wie recent heeft gelogd, en coach op hun setups."
        actions={
          <Link href="/journal" className="page-header-back">
            Mijn journal
          </Link>
        }
      />

      {error && (
        <div className="pl-empty" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div className="tj-panel">
        <div
          className="ttl"
          style={{
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          STUDENTEN
          <span className="status-chip on">
            {students.length} student{students.length === 1 ? "" : "en"}
          </span>
          {recentCount > 0 && (
            <span className="status-chip" style={{ color: "var(--gold-soft)" }}>
              {recentCount} actief vandaag
            </span>
          )}
        </div>
        <p className="pl-sub2" style={{ marginBottom: 14 }}>
          Gesorteerd op recente journal-activiteit. Open een journal om read-only
          mee te kijken.
        </p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Laatste update</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Acties</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const freshness = activityFreshness(u.lastJournalActivityAt);
                const isSelf = u.uid === profile?.uid;
                return (
                  <tr key={u.uid}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {u.displayName}
                        {isSelf ? " (jij)" : ""}
                        {u.role === "admin" && !isSelf ? (
                          <span
                            className="status-chip"
                            style={{ marginLeft: 8 }}
                          >
                            coach
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          color: "var(--paper-dim)",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {u.email}
                      </div>
                    </td>
                    <td>
                      <span className={`activity-pill ${freshness}`}>
                        {formatRelativeActivity(u.lastJournalActivityAt)}
                      </span>
                      {u.lastJournalActivityAt && (
                        <div
                          style={{
                            color: "var(--paper-dim)",
                            fontSize: 10,
                            marginTop: 4,
                          }}
                        >
                          {new Date(u.lastJournalActivityAt).toLocaleString(
                            "nl-NL",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-chip ${u.disabled ? "off" : "on"}`}
                      >
                        {u.disabled ? "Disabled" : "Actief"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="tb-addbtn"
                          style={{ fontSize: 11.5, padding: "8px 12px" }}
                          onClick={() => {
                            setCoachTarget({
                              uid: u.uid,
                              displayName: u.displayName || "Student",
                              email: u.email || "",
                            });
                            router.push("/journal");
                          }}
                        >
                          {isSelf ? "Open journal" : "Bekijk journal"}
                        </button>
                        <button
                          type="button"
                          className="pl-reset-btn"
                          disabled={busyUid === u.uid || isSelf}
                          onClick={async () => {
                            const action = u.disabled
                              ? "activeren"
                              : "deactiveren";
                            const ok = window.confirm(
                              `Student ${u.email || u.displayName} ${action}?`,
                            );
                            if (!ok) return;
                            setBusyUid(u.uid);
                            try {
                              await setAdminUserDisabled(u.uid, !u.disabled);
                              setUsers((prev) =>
                                prev.map((x) =>
                                  x.uid === u.uid
                                    ? { ...x, disabled: !u.disabled }
                                    : x,
                                ),
                              );
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : "Actie mislukt",
                              );
                            } finally {
                              setBusyUid(null);
                            }
                          }}
                        >
                          {u.disabled ? "Activeren" : "Deactiveren"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!users.length && !error && (
            <div className="tj-empty">Nog geen studenten.</div>
          )}
        </div>
      </div>

      <div className="tj-panel">
        <button
          type="button"
          className="ttl"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--paper-dim)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={() => setShowSystem((v) => !v)}
        >
          SYSTEEM / BUDGET {showSystem ? "▴" : "▾"}
        </button>
        {showSystem && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span className="status-chip">
                Firebase budget €{billing?.budgetEur ?? 10}
              </span>
              <span
                className={`status-chip ${billing?.exceeded ? "off" : "on"}`}
              >
                {billing?.exceeded ? "Geblokkeerd" : "Actief"}
              </span>
            </div>
            <p className="pl-sub2" style={{ marginBottom: 12 }}>
              Kill-switch bij overschrijding. Alleen voor jou / Samir — niet voor
              coaching.
            </p>
            {billing?.usage && (
              <>
                <div className="billing-meter" aria-hidden="true">
                  <div
                    className={`billing-meter-fill ${meterCls}`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
                <div className="pl-sub2" style={{ marginBottom: 12 }}>
                  Meter {billing.usage.period}: €
                  {billing.usage.estimatedCostEur.toFixed(2)} / €
                  {billing.budgetEur} ({percent.toFixed(0)}%)
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="pl-reset-btn"
                disabled={billingBusy || Boolean(billing?.exceeded)}
                onClick={async () => {
                  const ok = window.confirm(
                    "App blokkeren voor alle gebruikers?",
                  );
                  if (!ok) return;
                  setBillingBusy(true);
                  try {
                    const next = await setBillingExceeded(true, "manual_lock");
                    setBilling(next);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Lock mislukt");
                  } finally {
                    setBillingBusy(false);
                  }
                }}
              >
                App blokkeren
              </button>
              <button
                type="button"
                className="pl-reset-btn"
                disabled={billingBusy || !billing?.exceeded}
                onClick={async () => {
                  const ok = window.confirm("App ontgrendelen?");
                  if (!ok) return;
                  setBillingBusy(true);
                  try {
                    const next = await setBillingExceeded(
                      false,
                      "manual_unlock",
                    );
                    setBilling(next);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Unlock mislukt");
                  } finally {
                    setBillingBusy(false);
                  }
                }}
              >
                Ontgrendelen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <CoachingInner />
    </RequireAuth>
  );
}
