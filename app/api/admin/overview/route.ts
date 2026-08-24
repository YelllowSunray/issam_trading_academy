import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { normalizeMembership } from "@/lib/auth/membership";
import { requireAdmin } from "@/lib/auth/request";
import { countLessons, listCourses, progressCountsByUser } from "@/lib/courses/store";
import { getPlatformSettings, stripeConfigured } from "@/lib/platform/settings";
import type { AdminOverview, MemberRow } from "@/lib/platform/types";
import { listCoachStudents } from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    const [users, courses, settings] = await Promise.all([
      listCoachStudents(),
      listCourses(),
      getPlatformSettings(),
    ]);
    const progress = await progressCountsByUser(users.map((u) => u.uid));
    const lessonsTotal = courses
      .filter((c) => c.published)
      .reduce((sum, c) => sum + countLessons(c), 0);

    const now = Date.now();
    const members: MemberRow[] = users.map((u) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      membership: normalizeMembership(u),
      disabled: Boolean(u.disabled),
      createdAt: u.createdAt,
      lastJournalActivityAt: u.lastJournalActivityAt || null,
      lastSeenAt: u.lastSeenAt || null,
      lessonsCompleted: progress.get(u.uid) || 0,
      lessonsTotal,
    }));

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
        published: courses.filter((c) => c.published).length,
        lessons: courses.reduce((sum, c) => sum + countLessons(c), 0),
      },
      community: {
        telegramConfigured: Boolean(settings.telegramInviteUrl),
      },
      stripe: {
        configured: stripeConfigured(),
      },
    };

    return NextResponse.json({ overview, members, courses, settings });
  });
}
