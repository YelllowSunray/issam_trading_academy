export type UserRole = "student" | "admin";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  disabled: boolean;
};
