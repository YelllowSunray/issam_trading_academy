import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";

export async function GET(req: Request) {
  return withApiError(async () => {
    // Always allow profile fetch so the client can render billing lock UI.
    const user = await requireAuthUser(req, { allowWhenBillingExceeded: true });
    return NextResponse.json(user);
  });
}
