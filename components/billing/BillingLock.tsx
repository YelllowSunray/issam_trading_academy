"use client";

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
            Geschatte app-usage {info.usage.period}: €
            {info.usage.estimatedCostEur.toFixed(2)} / €{info.budgetEur} (
            {info.usage.percentUsed.toFixed(0)}%)
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
                {unlocking ? "Ontgrendelen…" : "Ontgrendel app (na betaalplan)"}
              </button>
            )}
            <p className="pl-sub2">
              Issam ziet een lock-scherm met jouw WhatsApp/e-mail tot jij ontgrendelt.
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
                "TradingAcadamy Firebase budget / betaalplan",
              )}`}
              style={{ textAlign: "center", textDecoration: "none" }}
            >
              E-mail {info.contactEmail}
            </a>
            <p className="pl-sub2">
              De app werkt weer zodra Samir een betaalplan heeft afgesproken en de
              blokkade opheft.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
