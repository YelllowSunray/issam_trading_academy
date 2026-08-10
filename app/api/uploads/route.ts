import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { uploadScreenshot } from "@/lib/journal/store";

export async function POST(req: Request) {
  return withApiError(async () => {
    const body = (await req.json()) as { dataUrl?: string };
    if (!body?.dataUrl) return jsonError("dataUrl ontbreekt");
    const imageUrl = await uploadScreenshot(body.dataUrl);
    return NextResponse.json({ imageUrl });
  });
}
