"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { PlatformShell } from "./PlatformShell";
import { RequireMember } from "./RequireMember";

export function MemberPage({
  children,
  flush = false,
}: {
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <RequireAuth>
      <RequireMember>
        <PlatformShell flush={flush}>{children}</PlatformShell>
      </RequireMember>
    </RequireAuth>
  );
}
