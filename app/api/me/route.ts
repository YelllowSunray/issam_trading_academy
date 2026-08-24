import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { toAuthUser, updateUserProfile } from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    // Always allow profile fetch so the client can render billing lock UI.
    const user = await requireAuthUser(req, {
      allowWhenBillingExceeded: true,
      allowWithoutMembership: true,
    });
    return NextResponse.json(user);
  });
}

export async function PATCH(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req, {
      allowWhenBillingExceeded: true,
      allowWithoutMembership: true,
    });
    const body = (await req.json().catch(() => ({}))) as {
      displayName?: unknown;
    };

    const profile = await updateUserProfile(user.uid, {
      displayName:
        typeof body.displayName === "string" ? body.displayName : undefined,
    });

    return NextResponse.json(await toAuthUser(profile));
  });
}
