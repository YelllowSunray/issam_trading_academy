"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserMenu } from "@/components/ui/UserMenu";
import { MOBILE_DOCK, PLATFORM_NAV } from "@/lib/platform/nav";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/LocaleProvider";
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
  const t = useT();
  const admin = profile?.role === "admin";
  const items = PLATFORM_NAV.filter((item) => !item.adminOnly || admin);
  const navLabel: Record<string, string> = {
    "/dashboard": t("nav.dashboard"),
    "/signals": t("nav.signals"),
    "/journal": t("nav.journal"),
    "/learn": t("nav.academy"),
    "/crypto": t("nav.crypto"),
    "/community": t("nav.community"),
    "/admin": t("nav.admin"),
    "/settings": t("nav.profile"),
  };

  function active(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/settings") return pathname === "/settings";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="plat-shell">
      <aside className="plat-sidebar">
        <Link href="/dashboard" className="plat-sidebar-brand">
          <span className="plat-sidebar-mark">TC</span>
          <span className="plat-sidebar-name">
            Trade<span>chain</span>
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
              {navLabel[item.href] || item.label}
            </Link>
          ))}
        </nav>
        <div className="plat-sidebar-end">
          {profile && (
            <span className="plat-member-chip">
              {admin ? t("common.admin") : t(`membership.${profile.membership}`)}
            </span>
          )}
          <UserMenu isAdmin={admin} />
          <LanguageSwitcher />
        </div>
      </aside>

      <div className="plat-main">
        <div className={flush ? "plat-body-flush" : "plat-body"}>
          <CoachViewBanner />
          {children}
        </div>
      </div>

      <nav className="plat-dock" aria-label={t("nav.mainMenu")}>
        {MOBILE_DOCK.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={active(item.href) ? "active" : ""}
          >
            <NavIcon id={item.icon} />
            {navLabel[item.href] || item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
