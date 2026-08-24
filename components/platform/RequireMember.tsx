"use client";

import { isActiveMembership } from "@/lib/auth/membership";
import { useAuth } from "@/components/auth/AuthProvider";
import { MembershipGate } from "./MembershipGate";

export function RequireMember({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-[var(--paper-dim)] text-sm">
        Laden…
      </div>
    );
  }

  if (!isActiveMembership(profile?.membership, profile?.role)) {
    return <MembershipGate />;
  }

  return <>{children}</>;
}
