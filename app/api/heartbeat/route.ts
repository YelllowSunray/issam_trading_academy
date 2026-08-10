import { NextResponse } from "next/server";
import { assertMt5Secret, withApiError } from "@/lib/api/errors";
import { receiveHeartbeat } from "@/lib/mt5/store";

export async function POST(req: Request) {
  return withApiError(async () => {
    assertMt5Secret(req);
    const data = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    await receiveHeartbeat(data);
    return NextResponse.json({ ok: true });
  });
}
