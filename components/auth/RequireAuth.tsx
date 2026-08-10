"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  fetchBillingStatus,
  setBillingExceeded,
  type BillingLockInfo,
} from "@/lib/journal/api-client";
import { hardReplace } from "@/lib/navigation";
import { BillingLock } from "@/components/billing/BillingLock";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading, profile } = useAuth();
  const pathname = usePathname();
  const [billing, setBilling] = useState<BillingLockInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  const refreshBilling = useCallback(async () => {
    try {
      const status = await fetchBillingStatus();
      setBilling(status);
    } catch {
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      hardReplace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    void refreshBilling();
  }, [firebaseUser, loading, pathname, refreshBilling]);

  if (loading || (firebaseUser && billingLoading)) {
    return (
      <div className="min-h-full flex items-center justify-center text-[var(--paper-dim)] text-sm">
        Laden…
      </div>
    );
  }

  if (!firebaseUser) return null;

  if (profile?.disabled) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="pl-empty max-w-md text-center">
          Dit account is gedeactiveerd. Neem contact op met de academy.
        </div>
      </div>
    );
  }

  if (billing?.exceeded) {
    const ownerEmail = (billing.ownerEmail || billing.contactEmail || "")
      .trim()
      .toLowerCase();
    const canManageBilling =
      Boolean(profile?.email) &&
      profile!.email.trim().toLowerCase() === ownerEmail;

    return (
      <BillingLock
        info={billing}
        canManageBilling={canManageBilling}
        unlocking={unlocking}
        onUnlock={
          canManageBilling
            ? async () => {
                setUnlocking(true);
                try {
                  const next = await setBillingExceeded(false, "manual_unlock");
                  setBilling(next);
                } finally {
                  setUnlocking(false);
                }
              }
            : undefined
        }
      />
    );
  }

  return <>{children}</>;
}
