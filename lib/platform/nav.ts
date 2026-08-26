export type PlatformNavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export const PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/journal", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/crypto", label: "Crypto" },
  { href: "/news", label: "Nieuws" },
  { href: "/tools", label: "Tools" },
  { href: "/admin", label: "Admin", adminOnly: true },
];
