"use client";

import { useT } from "@/components/i18n/LocaleProvider";
import { MarketsChartPanel } from "@/components/markets/MarketsChartPanel";
import { MemberPage } from "@/components/platform/MemberPage";

function MarketsInner() {
  const t = useT();

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">{t("markets.eyebrow")}</p>
      <h1 className="tj-title">{t("markets.title")}</h1>
      <p className="pl-sub">{t("markets.lead")}</p>
      <MarketsChartPanel height={520} />
    </div>
  );
}

export default function MarketsPage() {
  return (
    <MemberPage>
      <MarketsInner />
    </MemberPage>
  );
}
