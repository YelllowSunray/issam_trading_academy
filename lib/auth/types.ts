export type UserRole = "student" | "admin";
export type MembershipStatus =
  | "none"
  | "coaching_free"
  | "subscriber"
  | "expired";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  membership: MembershipStatus;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp of last journal/MT5 activity (for coaching overview). */
  lastJournalActivityAt?: string | null;
  lastSeenAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  membershipUpdatedAt?: string | null;
  membershipUpdatedBy?: string | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  telegramInviteUrl?: string | null;
  telegramInviteExpiresAt?: string | null;
  telegramInviteChatId?: string | null;
  telegramInviteTier?: "vip" | "normal" | null;
};

export type CoachTarget = {
  uid: string;
  displayName: string;
  email: string;
};

export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  membership: MembershipStatus;
  disabled: boolean;
  telegramId?: string | null;
  telegramUsername?: string | null;
};
