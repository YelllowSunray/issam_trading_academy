"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { PlatformShell } from "./PlatformShell";

export function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PlatformShell>{children}</PlatformShell>
    </RequireAuth>
  );
}
