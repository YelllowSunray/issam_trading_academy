import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { listAnnotations } from "@/lib/journal/store";

export async function GET() {
  return withApiError(async () => {
    const annotations = await listAnnotations();
    return NextResponse.json(annotations);
  });
}
