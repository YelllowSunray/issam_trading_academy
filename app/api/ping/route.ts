import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** No Firebase — used to verify API functions boot on Vercel. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    hasProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
    hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    privateKeyLen: (process.env.FIREBASE_PRIVATE_KEY || "").length,
    privateKeyHasBegin: (process.env.FIREBASE_PRIVATE_KEY || "").includes(
      "BEGIN PRIVATE KEY",
    ),
    privateKeyHasEscapedNl: (process.env.FIREBASE_PRIVATE_KEY || "").includes(
      "\\n",
    ),
    privateKeyHasRealNl: (process.env.FIREBASE_PRIVATE_KEY || "").includes(
      "\n",
    ),
  });
}
