import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";
import { listProgress, setLessonProgress } from "@/lib/courses/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    return NextResponse.json(await listProgress(user.uid));
  });
}

export async function PUT(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const body = (await req.json()) as {
      courseId?: string;
      lessonId?: string;
      completed?: boolean;
    };
    if (!body.courseId || !body.lessonId || typeof body.completed !== "boolean") {
      return jsonError("courseId, lessonId en completed zijn verplicht");
    }
    const row = await setLessonProgress(
      user.uid,
      body.courseId,
      body.lessonId,
      body.completed,
    );
    return NextResponse.json({ ok: true, progress: row });
  });
}
