import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminApp } from "@/components/admin/AdminApp";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default function AdminPage() {
  return (
    <RequireAuth>
      <PlatformShell>
        <AdminApp />
      </PlatformShell>
    </RequireAuth>
  );
}
