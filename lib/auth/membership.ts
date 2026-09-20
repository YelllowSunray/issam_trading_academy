import type { MembershipStatus, UserProfile, UserRole } from "./types";

export const MEMBERSHIP_STATUSES: MembershipStatus[] = [
  "none",
  "coaching_free",
  "subscriber",
  "expired",
];

export const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  none: "No access",
  coaching_free: "1:1 coaching",
  subscriber: "VIP",
  expired: "Subscription expired",
};

export function normalizeMembership(
  profile: Pick<UserProfile, "role" | "membership" | "createdAt">,
): MembershipStatus {
  if (profile.membership) return profile.membership;
  if (profile.role === "admin") return "coaching_free";
  // Profiles created before membership existed keep access.
  return profile.createdAt ? "coaching_free" : "none";
}

export function isActiveMembership(
  membership: MembershipStatus | null | undefined,
  role?: UserRole,
): boolean {
  if (role === "admin") return true;
  return membership === "coaching_free" || membership === "subscriber";
}

export function hasPlatformAccess(profile: {
  role: UserRole;
  membership?: MembershipStatus | null;
  disabled?: boolean;
}): boolean {
  if (profile.disabled) return false;
  return isActiveMembership(profile.membership, profile.role);
}

/** Paid VIP or 1:1 coaching (or admin) → VIP Telegram-groep. */
export function isVipTelegramTier(profile: {
  role?: UserRole | null;
  membership?: MembershipStatus | null;
}): boolean {
  if (profile.role === "admin") return true;
  return (
    profile.membership === "subscriber" ||
    profile.membership === "coaching_free"
  );
}
