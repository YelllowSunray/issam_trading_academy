import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { normalizeMembership } from "@/lib/auth/membership";
import { requireAdmin } from "@/lib/auth/request";
import { countBacktestsByUser } from "@/lib/backtest/store";
import {
  countCompletedCourses,
  countLessons,
  listCourses,
  progressLessonIdsByUser,
} from "@/lib/courses/store";
import { countGoalsByUser } from "@/lib/goals/store";
import { getPlatformSettings, stripeConfigured } from "@/lib/platform/settings";
import type { AdminOverview, MemberRow } from "@/lib/platform/types";
import { listSignals } from "@/lib/signals/store";
import { listCoachStudents } from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    const [users, courses, settings, signals] = await Promise.all([
      listCoachStudents(),
      listCourses(),
      getPlatformSettings(),
      listSignals(80),
    ]);
    const uids = users.map((u) => u.uid);
    const published = courses.filter((c) => c.published);
    const [progressIds, goalsByUser, backtestsByUser] = await Promise.all([
      progressLessonIdsByUser(uids),
      countGoalsByUser(uids),
      countBacktestsByUser(uids),
    ]);
    const lessonsTotal = published.reduce((sum, c) => sum + countLessons(c), 0);

    const now = Date.now();
    const members: MemberRow[] = users.map((u) => {
      const lessonIds = progressIds.get(u.uid) || new Set<string>();
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        membership: normalizeMembership(u),
        disabled: Boolean(u.disabled),
        createdAt: u.createdAt,
        lastJournalActivityAt: u.lastJournalActivityAt || null,
        lastSeenAt: u.lastSeenAt || null,
        lessonsCompleted: lessonIds.size,
        lessonsTotal,
        telegramLinked: Boolean(u.telegramId),
        telegramUsername: u.telegramUsername || null,
        goalsCount: goalsByUser.get(u.uid) || 0,
        backtestsCount: backtestsByUser.get(u.uid) || 0,
        certificatesCount: countCompletedCourses(published, lessonIds),
      };
    });

    const students = members.filter((m) => m.role !== "admin");
    const overview: AdminOverview = {
      members: {
        total: members.length,
        coachingFree: students.filter((m) => m.membership === "coaching_free")
          .length,
        subscriber: students.filter((m) => m.membership === "subscriber").length,
        expired: students.filter((m) => m.membership === "expired").length,
        none: students.filter((m) => m.membership === "none").length,
        disabled: members.filter((m) => m.disabled).length,
        journalActiveToday: members.filter((m) => {
          if (!m.lastJournalActivityAt) return false;
          return now - new Date(m.lastJournalActivityAt).getTime() < 24 * 3600_000;
        }).length,
        seenRecently: members.filter((m) => {
          if (!m.lastSeenAt) return false;
          return now - new Date(m.lastSeenAt).getTime() < 24 * 3600_000;
        }).length,
      },
      courses: {
        total: courses.length,
        published: published.length,
        lessons: courses.reduce((sum, c) => sum + countLessons(c), 0),
      },
      community: {
        telegramConfigured: Boolean(
          settings.telegramVipChatId ||
            settings.telegramNormalChatId ||
            settings.telegramInviteUrl,
        ),
        telegramLinked: members.filter((m) => m.telegramLinked).length,
      },
      signals: {
        total: signals.length,
        open: signals.filter((s) => s.status === "open").length,
      },
      goals: {
        students: members.filter((m) => m.goalsCount > 0).length,
        total: members.reduce((s, m) => s + m.goalsCount, 0),
      },
      backtests: {
        students: members.filter((m) => m.backtestsCount > 0).length,
        total: members.reduce((s, m) => s + m.backtestsCount, 0),
      },
      certificates: {
        awarded: members.reduce((s, m) => s + m.certificatesCount, 0),
      },
      stripe: {
        configured: stripeConfigured(),
      },
    };

    return NextResponse.json({ overview, members, courses, settings });
  });
}
