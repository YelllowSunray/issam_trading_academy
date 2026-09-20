"use client";

import { useT } from "@/components/i18n/LocaleProvider";

export type BillingLockInfo = {
  exceeded: boolean;
  budgetEur: number;
  title: string;
  studentMessage: string;
  adminMessage: string;
  ownerMessage?: string;
  ownerEmail?: string;
  contactName: string;
  contactEmail: string;
  whatsappE164: string | null;
  whatsappUrl: string | null;
  usage?: {
    period: string;
    estimatedCostEur: number;
    percentUsed: number;
    reads: number;
    writes: number;
    deletes: number;
    uploadBytes: number;
  } | null;
};

export function BillingLock({
  info,
  canManageBilling,
  onUnlock,
  unlocking,
}: {
  info: BillingLockInfo;
  /** Only Samir (billing owner) — not other coaches/admins. */
  canManageBilling: boolean;
  onUnlock?: () => void;
  unlocking?: boolean;
}) {
  const t = useT();
  const message = canManageBilling
    ? info.ownerMessage || info.adminMessage
    : info.studentMessage;

  return (
    <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
      <div className="tj-panel" style={{ maxWidth: 520, width: "100%" }}>
        <div className="tj-eyebrow">BILLING</div>
        <div className="tj-title" style={{ fontSize: 22 }}>
          {info.title}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--paper-dim)" }}>
          {message}
        </p>

        {canManageBilling && info.usage && (
          <div className="pl-sub2" style={{ marginTop: 14 }}>
            {t("billing.usage", {
              period: info.usage.period,
              used: info.usage.estimatedCostEur.toFixed(2),
              budget: info.budgetEur,
              pct: info.usage.percentUsed.toFixed(0),
            })}
          </div>
        )}

        {canManageBilling ? (
          <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
            {onUnlock && (
              <button
                type="button"
                className="tj-savebtn"
                disabled={unlocking}
                onClick={onUnlock}
              >
                {unlocking ? t("billing.unlocking") : t("billing.unlock")}
              </button>
            )}
            <p className="pl-sub2">
              {t("billing.ownerNote")}
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
            {info.whatsappUrl ? (
              <a
                className="tj-savebtn"
                href={info.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                WhatsApp {info.contactName}
              </a>
            ) : null}
            <a
              className="pl-reset-btn"
              href={`mailto:${info.contactEmail}?subject=${encodeURIComponent(
                t("billing.mailSubject"),
              )}`}
              style={{ textAlign: "center", textDecoration: "none" }}
            >
              {t("common.email")} {info.contactEmail}
            </a>
            <p className="pl-sub2">
              {t("billing.studentNote")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
