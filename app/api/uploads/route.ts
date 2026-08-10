import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { uploadScreenshot } from "@/lib/journal/store";

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const body = (await req.json()) as { dataUrl?: string };
    if (!body?.dataUrl) return jsonError("dataUrl ontbreekt");
    const imageUrl = await uploadScreenshot(user.uid, body.dataUrl);
    return NextResponse.json({ imageUrl });
  });
}
