"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserMenu } from "@/components/ui/UserMenu";
import { MEMBERSHIP_LABELS } from "@/lib/auth/membership";
import { PLATFORM_NAV } from "@/lib/platform/nav";
import { CoachViewBanner } from "./CoachViewBanner";

export function PlatformShell({
  children,
  flush = false,
}: {
  children: React.ReactNode;
  flush?: boolean;
}) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const admin = profile?.role === "admin";
  const items = PLATFORM_NAV.filter((item) => !item.adminOnly || admin);

  function active(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="plat-shell">
      <header className="plat-nav">
        <Link href="/dashboard" className="tb-brand" onClick={() => setOpen(false)}>
          Trading<span>Acadamy</span>
        </Link>
        <button
          type="button"
          className="plat-burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={`plat-links${open ? " open" : ""}`}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`plat-link${active(item.href) ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="plat-nav-end">
          {profile && (
            <span className="plat-member-chip">
              {admin ? "Admin" : MEMBERSHIP_LABELS[profile.membership]}
            </span>
          )}
          <UserMenu isAdmin={admin} />
        </div>
      </header>
      <div className={flush ? "plat-body-flush" : "plat-body"}>
        <CoachViewBanner />
        {children}
      </div>
    </div>
  );
}
