import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { getSettings, updateSettings } from "@/lib/journal/store";
import type { AppSettings } from "@/lib/journal/types";

export async function GET() {
  return withApiError(async () => {
    const settings = await getSettings();
    return NextResponse.json(settings);
  });
}

export async function PUT(req: Request) {
  return withApiError(async () => {
    const body = (await req.json()) as Partial<AppSettings>;
    const settings = await updateSettings(body);
    return NextResponse.json(settings);
  });
}
