export type PlatformNavItem = {
  href: string;
  label: string;
  icon: NavIconId;
  adminOnly?: boolean;
};

export type NavIconId =
  | "home"
  | "academy"
  | "signals"
  | "journal"
  | "crypto"
  | "community"
  | "admin"
  | "profile";

export const PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/signals", label: "Signals", icon: "signals" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/learn", label: "Academy", icon: "academy" },
  { href: "/crypto", label: "Crypto", icon: "crypto" },
  { href: "/community", label: "Community", icon: "community" },
  { href: "/admin", label: "Admin", icon: "admin", adminOnly: true },
];

export const MOBILE_DOCK: Array<{
  href: string;
  label: string;
  icon: NavIconId;
}> = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/signals", label: "Signals", icon: "signals" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/learn", label: "Academy", icon: "academy" },
  { href: "/settings", label: "Profiel", icon: "profile" },
];
