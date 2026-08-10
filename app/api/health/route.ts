import { NextResponse } from "next/server";
import { getAdminConfigStatus } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/** Deploy diagnostics — no secrets returned. */
export async function GET() {
  const config = getAdminConfigStatus();
  let adminOk = false;
  let adminError: string | null = null;

  if (!config.configured) {
    return NextResponse.json(
      { ok: false, config, adminError: "missing Firebase Admin env vars" },
      { status: 500 },
    );
  }

  try {
    const { adminAuth } = await import("@/lib/firebase/admin");
    adminAuth();
    adminOk = true;
  } catch (err) {
    adminError = err instanceof Error ? err.message : "admin init failed";
    console.error("[health] admin init failed", err);
  }

  return NextResponse.json(
    { ok: adminOk, config, adminError },
    { status: adminOk ? 200 : 500 },
  );
}
