import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { listCourses } from "@/lib/courses/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    return NextResponse.json(await listCourses({ publishedOnly: true }));
  });
}
