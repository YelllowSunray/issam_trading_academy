"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserMenu } from "@/components/ui/UserMenu";
import { MEMBERSHIP_LABELS } from "@/lib/auth/membership";
import { MOBILE_DOCK, PLATFORM_NAV } from "@/lib/platform/nav";
import { CoachViewBanner } from "./CoachViewBanner";
import { NavIcon } from "./NavIcon";

export function PlatformShell({
  children,
  flush = false,
}: {
  children: React.ReactNode;
  flush?: boolean;
}) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const admin = profile?.role === "admin";
  const items = PLATFORM_NAV.filter((item) => !item.adminOnly || admin);

  function active(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/settings") return pathname === "/settings";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="plat-shell">
      <aside className="plat-sidebar">
        <Link href="/dashboard" className="plat-sidebar-brand">
          <span className="plat-sidebar-mark">TA</span>
          <span className="plat-sidebar-name">
            Trading<span>Acadamy</span>
          </span>
        </Link>
        <nav className="plat-side-links">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`plat-side-link${active(item.href) ? " active" : ""}`}
            >
              <NavIcon id={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="plat-sidebar-end">
          {profile && (
            <span className="plat-member-chip">
              {admin ? "Admin" : MEMBERSHIP_LABELS[profile.membership]}
            </span>
          )}
          <UserMenu isAdmin={admin} />
        </div>
      </aside>

      <div className="plat-main">
        <div className={flush ? "plat-body-flush" : "plat-body"}>
          <CoachViewBanner />
          {children}
        </div>
      </div>

      <nav className="plat-dock" aria-label="Hoofdmenu">
        {MOBILE_DOCK.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={active(item.href) ? "active" : ""}
          >
            <NavIcon id={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
