import type { NavIconId } from "@/lib/platform/nav";

export function NavIcon({ id }: { id: NavIconId }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (id === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (id === "signals") {
    return (
      <svg {...common}>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19V3" />
      </svg>
    );
  }
  if (id === "journal") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  }
  if (id === "academy") {
    return (
      <svg {...common}>
        <path d="M3 10 12 5l9 5-9 5-9-5z" />
        <path d="M7 12.5v4.2c0 .4.7 1.4 5 2.3 4.3-.9 5-1.9 5-2.3v-4.2" />
      </svg>
    );
  }
  if (id === "crypto") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M9.5 8.5h4.2a2.2 2.2 0 0 1 0 4.4H9.5m0 0h4.6A2.1 2.1 0 0 1 16 15a2.2 2.2 0 0 1-2.2 2.2H9.5M12 7v1.5M12 15.5V17" />
      </svg>
    );
  }
  if (id === "community") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="3" />
        <circle cx="16.5" cy="10.5" r="2.4" />
        <path d="M4 18.5c.6-2.4 2.6-4 5-4s4.4 1.6 5 4" />
        <path d="M14 18.5c.3-1.4 1.4-2.7 3.2-3.1" />
      </svg>
    );
  }
  if (id === "admin") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3V20.5M4.8 6.5l1.6 1.6M17.6 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.5l1.6-1.6M17.6 8.1l1.6-1.6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.2c.8-3.2 3.3-5 7-5s6.2 1.8 7 5" />
    </svg>
  );
}
