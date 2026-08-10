import { NextResponse } from "next/server";
import { getAdminConfigStatus, adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/** Deploy diagnostics — no secrets returned. */
export async function GET() {
  const config = getAdminConfigStatus();
  let adminOk = false;
  let adminError: string | null = null;

  if (config.configured) {
    try {
      // Touches credential init without needing a user token
      adminAuth();
      adminOk = true;
    } catch (err) {
      adminError = err instanceof Error ? err.message : "admin init failed";
    }
  } else {
    adminError = "missing Firebase Admin env vars";
  }

  const status = adminOk ? 200 : 500;
  return NextResponse.json(
    {
      ok: adminOk,
      config,
      adminError,
    },
    { status },
  );
}
