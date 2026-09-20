import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import { deleteCourse, getCourse, saveCourse } from "@/lib/courses/store";
import { tRequest } from "@/lib/i18n/server";
import type { CourseChapter } from "@/lib/platform/types";
import { writeAuditLog } from "@/lib/users/store";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiError(async () => {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const course = await getCourse(id);
    if (!course) return jsonError(await tRequest("api.courseNotFound"), 404);
    return NextResponse.json(course);
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const { id } = await ctx.params;
    const existing = await getCourse(id);
    if (!existing) return jsonError(await tRequest("api.courseNotFound"), 404);
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      published?: boolean;
      order?: number;
      chapters?: CourseChapter[];
    };
    const course = await saveCourse(
      {
        title: body.title || existing.title,
        description: body.description ?? existing.description,
        published: body.published ?? existing.published,
        order: body.order ?? existing.order,
        chapters: body.chapters ?? existing.chapters,
      },
      id,
    );
    await writeAuditLog({
      actorUid: admin.uid,
      action: "course_update",
      meta: { id },
    });
    return NextResponse.json(course);
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const { id } = await ctx.params;
    await deleteCourse(id);
    await writeAuditLog({
      actorUid: admin.uid,
      action: "course_delete",
      meta: { id },
    });
    return NextResponse.json({ ok: true });
  });
}
