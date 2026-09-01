import { randomUUID } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { trackUsage } from "@/lib/billing/meter";
import { adminDb } from "@/lib/firebase/admin";
import type {
  Course,
  CourseChapter,
  CourseLesson,
  LessonProgress,
} from "@/lib/platform/types";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

function coursesCol() {
  return adminDb().collection("courses");
}

function progressCol(uid: string) {
  return adminDb().collection("users").doc(uid).collection("lesson_progress");
}

function asCourse(id: string, data: Record<string, unknown>): Course {
  return {
    id,
    title: String(data.title || "Cursus"),
    description: String(data.description || ""),
    order: Number(data.order || 0),
    published: Boolean(data.published),
    chapters: Array.isArray(data.chapters) ? data.chapters : [],
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
  };
}

export function countLessons(course: Course): number {
  return course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
}

export async function listCourses(opts: { publishedOnly?: boolean } = {}) {
  const snap = await coursesCol().get();
  await meter({ reads: Math.max(1, snap.size) });
  const courses = snap.docs
    .map((d) => asCourse(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "nl"));
  if (opts.publishedOnly) return courses.filter((c) => c.published);
  return courses;
}

export async function getCourse(id: string): Promise<Course | null> {
  const snap = await coursesCol().doc(id).get();
  await meter({ reads: 1 });
  if (!snap.exists) return null;
  return asCourse(snap.id, (snap.data() || {}) as Record<string, unknown>);
}

export async function saveCourse(
  input: Partial<Course> & { title: string },
  id?: string,
): Promise<Course> {
  const now = new Date().toISOString();
  const courseId = id || randomUUID();
  const existing = id ? await getCourse(id) : null;
  const course: Course = {
    id: courseId,
    title: input.title.trim(),
    description: (input.description || "").trim(),
    order: input.order ?? existing?.order ?? Date.now(),
    published: Boolean(input.published),
    chapters: normalizeChapters(input.chapters ?? existing?.chapters ?? []),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  if (!course.title) throw new ApiError("Titel is verplicht", 400);
  await coursesCol().doc(courseId).set(course);
  await meter({ writes: 1, reads: id ? 1 : 0 });
  return course;
}

export async function deleteCourse(id: string) {
  await coursesCol().doc(id).delete();
  await meter({ deletes: 1 });
}

function normalizeChapters(chapters: CourseChapter[]): CourseChapter[] {
  return chapters
    .map((ch, i) => ({
      id: ch.id || randomUUID(),
      title: (ch.title || `Hoofdstuk ${i + 1}`).trim(),
      order: ch.order ?? i,
      lessons: (ch.lessons || []).map((lesson, j) =>
        normalizeLesson(lesson, j),
      ),
    }))
    .sort((a, b) => a.order - b.order);
}

function normalizeLesson(lesson: CourseLesson, index: number): CourseLesson {
  return {
    id: lesson.id || randomUUID(),
    title: (lesson.title || `Les ${index + 1}`).trim(),
    videoUrl: (lesson.videoUrl || "").trim(),
    body: lesson.body || "",
    order: lesson.order ?? index,
  };
}

export async function listProgress(uid: string): Promise<LessonProgress[]> {
  const snap = await progressCol(uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.docs.map((d) => d.data() as LessonProgress);
}

export async function setLessonProgress(
  uid: string,
  courseId: string,
  lessonId: string,
  completed: boolean,
) {
  const ref = progressCol(uid).doc(lessonId);
  if (completed) {
    const row: LessonProgress = {
      lessonId,
      courseId,
      completedAt: new Date().toISOString(),
    };
    await ref.set(row);
    await meter({ writes: 1 });
    return row;
  }
  await ref.delete();
  await meter({ deletes: 1 });
  return null;
}

export async function progressCountsByUser(
  uids: string[],
): Promise<Map<string, number>> {
  const ids = await progressLessonIdsByUser(uids);
  const map = new Map<string, number>();
  ids.forEach((set, uid) => map.set(uid, set.size));
  return map;
}

export async function progressLessonIdsByUser(
  uids: string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  await Promise.all(
    uids.map(async (uid) => {
      const snap = await progressCol(uid).get();
      map.set(uid, new Set(snap.docs.map((d) => d.id)));
      await meter({ reads: Math.max(1, snap.size) });
    }),
  );
  return map;
}

export function countCompletedCourses(
  courses: Course[],
  lessonIds: Set<string>,
) {
  return courses.filter((c) => {
    const lessons = c.chapters.flatMap((ch) => ch.lessons);
    return lessons.length > 0 && lessons.every((l) => lessonIds.has(l.id));
  }).length;
}

export function seedStarterCourse(): Course {
  const now = new Date().toISOString();
  return {
    id: "starter-smc",
    title: "SMC Foundations",
    description:
      "Eerste module van de academy: structuur, liquiditeit en hoe je setups in de journal zet.",
    order: 1,
    published: true,
    createdAt: now,
    updatedAt: now,
    chapters: [
      {
        id: "ch-1",
        title: "Welkom",
        order: 1,
        lessons: [
          {
            id: "les-1",
            title: "Hoe het platform werkt",
            videoUrl: "",
            body: "Koppel MT5 via Instellingen, log je setups in de journal, en review wekelijks met het P&L-dashboard. Community zit op Telegram.",
            order: 1,
          },
          {
            id: "les-2",
            title: "Journal-discipline",
            videoUrl: "",
            body: "Elke trade: richting, SL, tags (BOS / CHoCH / FVG / OB) en een screenshot van de setup. Zonder journal geen review.",
            order: 2,
          },
        ],
      },
      {
        id: "ch-2",
        title: "Markets die we volgen",
        order: 2,
        lessons: [
          {
            id: "les-3",
            title: "XAUUSD, WTI, US500, BTC",
            videoUrl: "",
            body: "Issam’s kernmarkten staan onder Markets als TradingView-charts. Crypto-overzicht is informatief — de journal blijft MT5.",
            order: 1,
          },
        ],
      },
    ],
  };
}
