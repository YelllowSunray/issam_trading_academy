import { JournalApp } from "@/components/journal/JournalApp";
import { MemberPage } from "@/components/platform/MemberPage";

export default function JournalPage() {
  return (
    <MemberPage flush>
      <JournalApp />
    </MemberPage>
  );
}
