"use client";

import { useEffect, useState } from "react";
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

function AdminInner() {
  const { profile, setAsUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [billing, setBilling] = useState<BillingLockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);

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

  if (profile && profile.role !== "admin") return null;

  const percent = billing?.usage?.percentUsed ?? 0;
  const meterCls =
    percent >= 100 || billing?.exceeded
      ? "danger"
      : percent >= 80
        ? "warn"
        : "";

  return (
    <div className="journal-main">
      <PageHeader
        title="Admin"
        subtitle="Gebruikers beheren en journals bekijken (read-only)."
        actions={
          <Link href="/settings" className="page-header-back">
            Instellingen
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
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          FIREBASE BUDGET (€{billing?.budgetEur ?? 10})
          <span className={`status-chip ${billing?.exceeded ? "off" : "on"}`}>
            {billing?.exceeded ? "Geblokkeerd" : "Actief"}
          </span>
        </div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          Project-brede kill-switch. Bij overschrijding stopt de app voor iedereen
          tot Samir een betaalplan voor de Google-databasekosten heeft afgesproken.
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
              {billing.usage.estimatedCostEur.toFixed(2)} / €{billing.budgetEur}{" "}
              ({percent.toFixed(0)}%) · {billing.usage.reads} reads ·{" "}
              {billing.usage.writes} writes
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
                "App blokkeren voor alle gebruikers? Alleen admins zien dan de lock-melding.",
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
            App blokkeren (budget)
          </button>
          <button
            type="button"
            className="pl-reset-btn"
            disabled={billingBusy || !billing?.exceeded}
            onClick={async () => {
              const ok = window.confirm("App ontgrendelen voor alle gebruikers?");
              if (!ok) return;
              setBillingBusy(true);
              try {
                const next = await setBillingExceeded(false, "manual_unlock");
                setBilling(next);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unlock mislukt");
              } finally {
                setBillingBusy(false);
              }
            }}
          >
            App ontgrendelen
          </button>
        </div>
      </div>

      <div className="tj-panel">
        <div className="ttl" style={{ marginBottom: 12 }}>
          GEBRUIKERS
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>E-mail</th>
                <th>Rol</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Acties</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td style={{ fontWeight: 600 }}>{u.displayName}</td>
                  <td style={{ color: "var(--paper-dim)" }}>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`status-chip ${u.disabled ? "off" : "on"}`}>
                      {u.disabled ? "Disabled" : "Actief"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="pl-reset-btn"
                        onClick={() => {
                          setAsUser(u.uid);
                          router.push("/journal");
                        }}
                      >
                        Bekijk
                      </button>
                      <button
                        type="button"
                        className="pl-reset-btn"
                        disabled={busyUid === u.uid || u.uid === profile?.uid}
                        onClick={async () => {
                          const action = u.disabled ? "activeren" : "deactiveren";
                          const ok = window.confirm(
                            `Gebruiker ${u.email || u.displayName} ${action}?`,
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
                              e instanceof Error ? e.message : "Actie mislukt",
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
              ))}
            </tbody>
          </table>
          {!users.length && !error && (
            <div className="tj-empty">Nog geen gebruikers.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminInner />
    </RequireAuth>
  );
}
