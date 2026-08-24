import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import {
  listCourses,
  saveCourse,
  seedStarterCourse,
} from "@/lib/courses/store";
import { writeAuditLog } from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    return NextResponse.json(await listCourses());
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const body = (await req.json().catch(() => ({}))) as {
      seed?: boolean;
      title?: string;
      description?: string;
      published?: boolean;
      chapters?: unknown;
    };
    if (body.seed) {
      const existing = await listCourses();
      if (existing.some((c) => c.id === "starter-smc")) {
        return jsonError("Voorbeeldcursus bestaat al");
      }
      const course = await saveCourse(seedStarterCourse(), "starter-smc");
      await writeAuditLog({
        actorUid: admin.uid,
        action: "course_seed",
        meta: { id: course.id },
      });
      return NextResponse.json(course);
    }
    if (!body.title) return jsonError("Titel is verplicht");
    const course = await saveCourse({
      title: body.title,
      description: body.description || "",
      published: Boolean(body.published),
      chapters: Array.isArray(body.chapters) ? body.chapters : [],
    });
    await writeAuditLog({
      actorUid: admin.uid,
      action: "course_create",
      meta: { id: course.id },
    });
    return NextResponse.json(course);
  });
}
