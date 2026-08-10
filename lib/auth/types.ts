export type UserRole = "student" | "admin";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp of last journal/MT5 activity (for coaching overview). */
  lastJournalActivityAt?: string | null;
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
  disabled: boolean;
};
