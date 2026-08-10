import { adminAuth } from "@/lib/firebase/admin";
import type { AuthUser } from "@/lib/auth/types";
import { assertBillingActive } from "@/lib/billing/store";
import {
  ensureUserProfile,
  getUserProfile,
  toAuthUser,
} from "@/lib/users/store";

type AuthOptions = {
  /** Skip project-wide billing kill-switch (status/unlock routes). */
  allowWhenBillingExceeded?: boolean;
};

async function authenticate(req: Request): Promise<AuthUser> {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throw new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(match[1]);
  } catch {
    throw new Response(JSON.stringify({ ok: false, error: "invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const profile = await ensureUserProfile({
    uid: decoded.uid,
    email: decoded.email || "",
    displayName: decoded.name || null,
  });

  if (profile.disabled) {
    throw new Response(JSON.stringify({ ok: false, error: "account disabled" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
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
  return authenticate(req);
}

export async function requireAdmin(
  req: Request,
  options: AuthOptions = {},
): Promise<AuthUser> {
  const user = await requireAuthUser(req, options);
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
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
    throw new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const profile = await getUserProfile(asUser);
  if (!profile) {
    throw new Response(JSON.stringify({ ok: false, error: "user not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return asUser;
}
