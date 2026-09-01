import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { SIGNAL_DISCLAIMER } from "@/lib/signals/types";
import { listSignals } from "@/lib/signals/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const signals = await listSignals(60);
    return NextResponse.json({ signals, disclaimer: SIGNAL_DISCLAIMER });
  });
}
