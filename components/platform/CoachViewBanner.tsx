"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/journal", label: "Journal" },
  { href: "/journal#backtest", label: "Backtest" },
  { href: "/signals", label: "Signals" },
  { href: "/learn", label: "Academy" },
  { href: "/learn/certificates", label: "Certificates" },
  { href: "/community", label: "Community" },
] as const;

function useHash(pathname: string) {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash.replace(/^#/, ""));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);
  return hash;
}

function linkActive(pathname: string, hash: string, href: string) {
  const [path, fragment] = href.split("#");
  if (path === "/journal") {
    if (pathname !== "/journal") return false;
    if (fragment === "backtest") return hash === "backtest";
    return hash !== "backtest" && hash !== "dashboard";
  }
  if (path === "/dashboard") return pathname === "/dashboard";
  if (path === "/learn/certificates") return pathname === "/learn/certificates";
  if (path === "/learn") {
    return (
      pathname === "/learn" ||
      (pathname.startsWith("/learn/") && pathname !== "/learn/certificates")
    );
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function CoachViewBanner() {
  const pathname = usePathname();
  const hash = useHash(pathname);
  const { profile, asUser, coachTarget, setCoachTarget } = useAuth();
  const active = Boolean(asUser && coachTarget && asUser !== profile?.uid);
  if (!active || !coachTarget) return null;

  return (
    <div className="coach-banner coach-banner-global no-print">
      <div>
        <div className="coach-banner-kicker">Coach-view · alleen-lezen</div>
        <div className="coach-banner-name">{coachTarget.displayName}</div>
        {coachTarget.email ? (
          <div className="coach-banner-email">{coachTarget.email}</div>
        ) : null}
        <div className="coach-banner-email">
          Dashboard, journal, backtest, academy, certificates en Telegram van
          deze student
        </div>
        <nav className="coach-banner-nav">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`plat-chip${linkActive(pathname, hash, item.href) ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="coach-banner-actions">
        <Link href="/admin" className="pl-reset-btn">
          Admin
        </Link>
        <button
          type="button"
          className="tb-addbtn"
          style={{ fontSize: 12, padding: "8px 12px" }}
          onClick={() => setCoachTarget(null)}
        >
          Stop coach-view
        </button>
      </div>
    </div>
  );
}
