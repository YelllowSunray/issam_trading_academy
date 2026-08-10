import { RequireAuth } from "@/components/auth/RequireAuth";
import { JournalApp } from "@/components/journal/JournalApp";

export default function JournalPage() {
  return (
    <RequireAuth>
      <JournalApp />
    </RequireAuth>
  );
}
