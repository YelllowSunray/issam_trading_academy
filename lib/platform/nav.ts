export type PlatformNavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export const PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/journal", label: "Journal" },
  { href: "/learn", label: "Cursus" },
  { href: "/community", label: "Community" },
  { href: "/markets", label: "Markets" },
  { href: "/tools", label: "Tools" },
  { href: "/news", label: "Nieuws" },
  { href: "/crypto", label: "Crypto" },
  { href: "/admin", label: "Admin", adminOnly: true },
];
