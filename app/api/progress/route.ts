import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser, requireSelfUid, resolveTargetUid } from "@/lib/auth/request";
import { listProgress, setLessonProgress } from "@/lib/courses/store";
import { tRequest } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    return NextResponse.json(await listProgress(uid));
  });
}

export async function PUT(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await requireSelfUid(req, user);
    const body = (await req.json()) as {
      courseId?: string;
      lessonId?: string;
      completed?: boolean;
    };
    if (!body.courseId || !body.lessonId || typeof body.completed !== "boolean") {
      return jsonError(await tRequest("api.progressFieldsRequired"));
    }
    const row = await setLessonProgress(
      uid,
      body.courseId,
      body.lessonId,
      body.completed,
    );
    return NextResponse.json({ ok: true, progress: row });
  });
}
