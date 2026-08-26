"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function UserMenu({ isAdmin }: { isAdmin?: boolean }) {
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const admin = Boolean(isAdmin || profile?.role === "admin");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const initial =
    (profile?.displayName || profile?.email || "?").trim().charAt(0).toUpperCase() ||
    "?";

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu-avatar">{initial}</span>
        <span className="user-menu-name">
          {profile?.displayName || profile?.email || "Account"}
        </span>
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-meta">
            <div>{profile?.displayName}</div>
            <div className="user-menu-email">{profile?.email}</div>
          </div>
          <Link href="/settings" className="user-menu-item" onClick={() => setOpen(false)}>
            Profiel &amp; instellingen
          </Link>
          {admin && (
            <Link href="/admin" className="user-menu-item" onClick={() => setOpen(false)}>
              Admin-overzicht
            </Link>
          )}
          <Link href="/" className="user-menu-item" onClick={() => setOpen(false)}>
            Homepage
          </Link>
          <button
            type="button"
            className="user-menu-item user-menu-danger"
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
          >
            Uitloggen
          </button>
        </div>
      )}
    </div>
  );
}
