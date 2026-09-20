"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MemberPage } from "@/components/platform/MemberPage";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { fetchCourses, fetchProgress } from "@/lib/journal/api-client";
import { dateLocale } from "@/lib/i18n";
import type { Course, LessonProgress } from "@/lib/platform/types";

function completedCourses(courses: Course[], progress: LessonProgress[]) {
  const done = new Set(progress.map((p) => p.lessonId));
  return courses.filter((c) => {
    const lessons = c.chapters.flatMap((ch) => ch.lessons);
    return lessons.length > 0 && lessons.every((l) => done.has(l.id));
  });
}

function CertificatesInner() {
  const { profile, asUser, coachTarget } = useAuth();
  const { t, locale } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCourses(), fetchProgress()])
      .then(([c, p]) => {
        setCourses(c);
        setProgress(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("common.loadFailed")));
  }, [asUser, t]);

  const done = useMemo(
    () => completedCourses(courses, progress),
    [courses, progress],
  );
  const active = done.find((c) => c.id === printId) || done[0] || null;

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">{t("learn.eyebrow")}</p>
      <h1 className="tj-title">{t("learn.certTitle")}</h1>
      <p className="pl-sub">{t("learn.certLead")}</p>
      <Link href="/learn" className="pl-reset-btn" style={{ marginBottom: 16 }}>
        {t("learn.backAcademy")}
      </Link>
      {error && <div className="pl-empty">{error}</div>}
      {!done.length && !error ? (
        <div className="pl-empty">{t("learn.noCert")}</div>
      ) : null}
      {done.length > 1 ? (
        <div className="plat-chip-row" style={{ marginBottom: 16 }}>
          {done.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`tb-tab${active?.id === c.id ? " active" : ""}`}
              onClick={() => setPrintId(c.id)}
            >
              {c.title}
            </button>
          ))}
        </div>
      ) : null}
      {active ? (
        <div className="cert-sheet">
          <p className="cert-kicker">Tradechain</p>
          <h2>{t("learn.certificate")}</h2>
          <p className="cert-name">
            {asUser && coachTarget
              ? coachTarget.displayName
              : profile?.displayName || "Trader"}
          </p>
          <p>{t("learn.completed", { title: active.title })}</p>
          <p className="cert-date">
            {new Date().toLocaleDateString(dateLocale(locale), {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <button
            type="button"
            className="tb-addbtn no-print"
            onClick={() => window.print()}
          >
            {t("learn.print")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function CertificatesPage() {
  return (
    <MemberPage>
      <CertificatesInner />
    </MemberPage>
  );
}
