import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { isVipTelegramTier } from "@/lib/auth/membership";
import { requireAuthUser, resolveTargetUid } from "@/lib/auth/request";
import { loadUserJournal } from "@/lib/ai/stats";
import { countLessons, listCourses, listProgress } from "@/lib/courses/store";
import { listGoals } from "@/lib/goals/store";
import { VIP_PUBLIC_CHANNEL } from "@/lib/platform/plans";
import { getLatestSignal } from "@/lib/signals/store";
import { getUserProfile } from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    const [trades, courses, progress, goals, signal, profile] = await Promise.all([
      loadUserJournal(uid),
      listCourses({ publishedOnly: true }),
      listProgress(uid),
      listGoals(uid),
      getLatestSignal(),
      getUserProfile(uid),
    ]);
    const done = new Set(progress.map((p) => p.lessonId));
    const lessonTotal = courses.reduce((s, c) => s + countLessons(c), 0);
    const lessonDone = courses
      .flatMap((c) => c.chapters.flatMap((ch) => ch.lessons))
      .filter((l) => done.has(l.id)).length;
    const nextCourse = courses.find((c) => {
      const lessons = c.chapters.flatMap((ch) => ch.lessons);
      return lessons.some((l) => !done.has(l.id));
    });
    const withEur = trades.filter((t) => t.eur != null);
    const totalEur = withEur.reduce((s, t) => s + (t.eur ?? 0), 0);
    const vip = isVipTelegramTier({
      role: profile?.role || user.role,
      membership: profile?.membership || user.membership,
    });

    return NextResponse.json({
      lastSignal: signal,
      academy: {
        completed: lessonDone,
        total: lessonTotal,
        nextCourseId: nextCourse?.id || null,
        nextCourseTitle: nextCourse?.title || null,
      },
      community: {
        linked: Boolean(profile?.telegramId),
        telegramUsername: profile?.telegramUsername || null,
        tier: vip ? "vip" : "normal",
        publicChannel: VIP_PUBLIC_CHANNEL,
      },
      pnl: {
        totalEur: withEur.length ? totalEur : null,
        tradeCount: trades.length,
        lastDate: trades[0]?.date || null,
      },
      goals,
    });
  });
}
