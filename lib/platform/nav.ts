export type PlatformNavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export const PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/learn", label: "Academy" },
  { href: "/signals", label: "Signals" },
  { href: "/journal", label: "Journal" },
  { href: "/crypto", label: "Crypto" },
  { href: "/community", label: "Community" },
  { href: "/admin", label: "Admin", adminOnly: true },
];
