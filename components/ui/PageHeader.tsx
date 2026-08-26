import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  backHref = "/journal",
  backLabel = "← Home",
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header-top">
        <Link href={backHref} className="page-header-back">
          {backLabel}
        </Link>
        {actions}
      </div>
      <h1 className="tj-title">{title}</h1>
      {subtitle ? <p className="pl-sub">{subtitle}</p> : null}
    </div>
  );
}
