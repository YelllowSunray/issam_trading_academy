import type { MembershipStatus } from "@/lib/auth/types";

export type CourseLesson = {
  id: string;
  title: string;
  videoUrl: string;
  body: string;
  order: number;
};

export type CourseChapter = {
  id: string;
  title: string;
  order: number;
  lessons: CourseLesson[];
};

export type Course = {
  id: string;
  title: string;
  description: string;
  order: number;
  published: boolean;
  chapters: CourseChapter[];
  createdAt: string;
  updatedAt: string;
};

export type LessonProgress = {
  lessonId: string;
  courseId: string;
  completedAt: string;
};

export type PlatformSettings = {
  telegramInviteUrl: string;
  telegramLabel: string;
  communityNote: string;
  telegramVipChatId: string;
  telegramNormalChatId: string;
  stripeEnabled: boolean;
  /** Shown on the paywall — must match the Stripe Price. */
  subscriberPriceLabel: string;
  /** Shown to 1:1 clients — billed outside the app. */
  coachingPriceNote: string;
};

export type AdminOverview = {
  members: {
    total: number;
    coachingFree: number;
    subscriber: number;
    expired: number;
    none: number;
    disabled: number;
    journalActiveToday: number;
    seenRecently: number;
  };
  courses: {
    total: number;
    published: number;
    lessons: number;
  };
  community: {
    telegramConfigured: boolean;
    telegramLinked: number;
  };
  signals: {
    total: number;
    open: number;
  };
  goals: {
    students: number;
    total: number;
  };
  backtests: {
    students: number;
    total: number;
  };
  certificates: {
    awarded: number;
  };
  stripe: {
    configured: boolean;
  };
};

export type MemberRow = {
  uid: string;
  email: string;
  displayName: string;
  role: "student" | "admin";
  membership: MembershipStatus;
  disabled: boolean;
  createdAt: string;
  lastJournalActivityAt: string | null;
  lastSeenAt: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  telegramLinked: boolean;
  telegramUsername: string | null;
  goalsCount: number;
  backtestsCount: number;
  certificatesCount: number;
};
