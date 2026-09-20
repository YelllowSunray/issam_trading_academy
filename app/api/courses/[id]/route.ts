import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { getCourse } from "@/lib/courses/store";
import { tRequest } from "@/lib/i18n/server";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const { id } = await ctx.params;
    const course = await getCourse(id);
    if (!course || (!course.published && user.role !== "admin")) {
      return jsonError(await tRequest("api.courseNotFound"), 404);
    }
    return NextResponse.json(course);
  });
}
