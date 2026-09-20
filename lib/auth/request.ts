import { adminAuth } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/api/errors";
import { isActiveMembership } from "@/lib/auth/membership";
import type { AuthUser } from "@/lib/auth/types";
import { assertBillingActive } from "@/lib/billing/store";
import {
  ensureUserProfile,
  getUserProfile,
  toAuthUser,
} from "@/lib/users/store";
import { tRequest } from "@/lib/i18n/server";

type AuthOptions = {
  /** Skip project-wide billing kill-switch (status/unlock routes). */
  allowWhenBillingExceeded?: boolean;
  /** Allow signed-in users without an active membership (profile / paywall). */
  allowWithoutMembership?: boolean;
};

async function authenticate(req: Request): Promise<AuthUser> {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throw new ApiError("unauthorized", 401);
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(match[1]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid token";
    console.error("[auth] verifyIdToken failed:", msg);
    throw new ApiError("invalid token", 401);
  }

  const profile = await ensureUserProfile({
    uid: decoded.uid,
    email: decoded.email || "",
    displayName: decoded.name || null,
  });

  if (profile.disabled) {
    throw new ApiError("account disabled", 403);
  }

  return toAuthUser(profile);
}

export async function requireAuthUser(
  req: Request,
  options: AuthOptions = {},
): Promise<AuthUser> {
  if (!options.allowWhenBillingExceeded) {
    await assertBillingActive();
  }
  const user = await authenticate(req);
  if (
    !options.allowWithoutMembership &&
    !isActiveMembership(user.membership, user.role)
  ) {
    throw new ApiError("membership_required", 402);
  }
  return user;
}

export async function requireAdmin(
  req: Request,
  options: AuthOptions = {},
): Promise<AuthUser> {
  const user = await requireAuthUser(req, options);
  if (user.role !== "admin") {
    throw new ApiError("forbidden", 403);
  }
  return user;
}

export async function resolveTargetUid(
  req: Request,
  self: AuthUser,
): Promise<string> {
  const { searchParams } = new URL(req.url);
  const asUser = searchParams.get("asUser");
  if (!asUser || asUser === self.uid) return self.uid;
  if (self.role !== "admin") {
    throw new ApiError("forbidden", 403);
  }
  const profile = await getUserProfile(asUser);
  if (!profile) {
    throw new ApiError("user not found", 404);
  }
  return asUser;
}

export async function requireSelfUid(
  req: Request,
  self: AuthUser,
): Promise<string> {
  const uid = await resolveTargetUid(req, self);
  if (uid !== self.uid) {
    throw new ApiError(await tRequest("api.coachViewReadOnly"), 403);
  }
  return uid;
}
