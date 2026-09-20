"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import { MemberPage } from "@/components/platform/MemberPage";
import { fetchCourses, fetchProgress } from "@/lib/journal/api-client";
import type { Course, LessonProgress } from "@/lib/platform/types";

function LearnInner() {
  const { asUser } = useAuth();
  const t = useT();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCourses(), fetchProgress()])
      .then(([c, p]) => {
        setCourses(c);
        setProgress(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("common.loadFailed")));
  }, [asUser, t]);

  const done = new Set(progress.map((p) => p.lessonId));

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">{t("learn.eyebrow")}</p>
      <h1 className="tj-title">{t("learn.title")}</h1>
      <p className="pl-sub">{t("learn.lead")}</p>
      <Link href="/learn/certificates" className="pl-reset-btn" style={{ marginBottom: 16 }}>
        {t("learn.certTitle")}
      </Link>
      {error && <div className="pl-empty">{error}</div>}
      <div className="plat-card-grid">
        {courses.map((course) => {
          const total = course.chapters.reduce((s, ch) => s + ch.lessons.length, 0);
          const completed = course.chapters
            .flatMap((ch) => ch.lessons)
            .filter((l) => done.has(l.id)).length;
          return (
            <Link key={course.id} href={`/learn/${course.id}`} className="plat-card">
              <div className="pl-label">{t("learn.course")}</div>
              <h2>{course.title}</h2>
              <p>{course.description || t("learn.noDescription")}</p>
              <div className="plat-progress">
                <div
                  className="plat-progress-fill"
                  style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
                />
              </div>
              <div className="pl-sub2">
                {t("learn.progress", {
                  done: completed,
                  total,
                  chapters: course.chapters.length,
                })}
              </div>
            </Link>
          );
        })}
      </div>
      {!courses.length && !error && (
        <div className="pl-empty">{t("learn.empty")}</div>
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <MemberPage>
      <LearnInner />
    </MemberPage>
  );
}
