"use client";

export type BillingLockInfo = {
  exceeded: boolean;
  budgetEur: number;
  title: string;
  studentMessage: string;
  adminMessage: string;
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
  isAdmin,
  onUnlock,
  unlocking,
}: {
  info: BillingLockInfo;
  isAdmin: boolean;
  onUnlock?: () => void;
  unlocking?: boolean;
}) {
  return (
    <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
      <div className="tj-panel" style={{ maxWidth: 520, width: "100%" }}>
        <div className="tj-eyebrow">BILLING</div>
        <div className="tj-title" style={{ fontSize: 22 }}>
          {info.title}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--paper-dim)" }}>
          {isAdmin ? info.adminMessage : info.studentMessage}
        </p>

        {isAdmin && info.usage && (
          <div className="pl-sub2" style={{ marginTop: 14 }}>
            Geschatte app-usage {info.usage.period}: €
            {info.usage.estimatedCostEur.toFixed(2)} / €{info.budgetEur} (
            {info.usage.percentUsed.toFixed(0)}%)
          </div>
        )}

        {isAdmin && (
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
            ) : (
              <div className="pl-empty">
                WhatsApp Samir: zet <code>NEXT_PUBLIC_BILLING_WHATSAPP</code>{" "}
                (bijv. +31612345678) in je env. Mail: {info.contactEmail}
              </div>
            )}
            <a
              className="pl-reset-btn"
              href={`mailto:${info.contactEmail}?subject=${encodeURIComponent(
                "TradingAcadamy Firebase budget",
              )}`}
              style={{ textAlign: "center", textDecoration: "none" }}
            >
              E-mail {info.contactEmail}
            </a>
            {onUnlock && (
              <button
                type="button"
                className="pl-reset-btn"
                disabled={unlocking}
                onClick={onUnlock}
              >
                {unlocking ? "Ontgrendelen…" : "Admin: ontgrendel app (na betaling)"}
              </button>
            )}
          </div>
        )}

        {!isAdmin && (
          <p
            className="pl-sub2"
            style={{ marginTop: 16 }}
          >
            Admins zijn geïnformeerd. De app werkt weer zodra het budget/betaalplan
            is geregeld.
          </p>
        )}
      </div>
    </div>
  );
}
