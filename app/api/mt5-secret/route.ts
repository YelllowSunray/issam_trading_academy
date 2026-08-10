import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { generateIngestSecret } from "@/lib/auth/secrets";
import {
  getIngestSecretMeta,
  rotateIngestSecret,
  writeAuditLog,
} from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const meta = await getIngestSecretMeta(user.uid);
    return NextResponse.json(meta);
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const secret = generateIngestSecret();
    await rotateIngestSecret(user.uid, secret);
    await writeAuditLog({
      actorUid: user.uid,
      action: "mt5_secret_rotated",
    });
    return NextResponse.json({
      secret,
      createdAt: new Date().toISOString(),
      configured: true,
    });
  });
}
