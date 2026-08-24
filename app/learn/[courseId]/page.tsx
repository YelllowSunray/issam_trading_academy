"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { MemberPage } from "@/components/platform/MemberPage";
import { fetchCourse, fetchProgress, setProgress } from "@/lib/journal/api-client";
import type { Course, LessonProgress } from "@/lib/platform/types";

function embedUrl(url: string) {
  if (!url) return null;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

function CourseInner({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProg] = useState<LessonProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetchCourse(courseId), fetchProgress()])
      .then(([c, p]) => {
        setCourse(c);
        setProg(p);
        const first = c.chapters[0]?.lessons[0]?.id;
        setActive(first || null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, [courseId]);

  const done = useMemo(() => new Set(progress.map((p) => p.lessonId)), [progress]);
  const lesson = course?.chapters
    .flatMap((ch) => ch.lessons)
    .find((l) => l.id === active);
  const video = lesson ? embedUrl(lesson.videoUrl) : null;

  async function toggleDone() {
    if (!course || !lesson) return;
    setBusy(true);
    try {
      const next = !done.has(lesson.id);
      await setProgress(course.id, lesson.id, next);
      setProg((prev) =>
        next
          ? [...prev, { lessonId: lesson.id, courseId: course.id, completedAt: new Date().toISOString() }]
          : prev.filter((p) => p.lessonId !== lesson.id),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="journal-main">
      <Link href="/learn" className="page-header-back">
        ← Alle cursussen
      </Link>
      {error && <div className="pl-empty">{error}</div>}
      {!course ? (
        <div className="journal-loading">Cursus laden…</div>
      ) : (
        <>
          <p className="tj-eyebrow">CURSUS</p>
          <h1 className="tj-title">{course.title}</h1>
          <p className="pl-sub">{course.description}</p>
          <div className="learn-layout">
            <aside className="learn-toc">
              {course.chapters.map((ch) => (
                <div key={ch.id} className="learn-chapter">
                  <div className="pl-label">{ch.title}</div>
                  {ch.lessons.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={`learn-lesson${active === l.id ? " active" : ""}`}
                      onClick={() => setActive(l.id)}
                    >
                      <span>{l.title}</span>
                      {done.has(l.id) ? <span className="status-chip on">klaar</span> : null}
                    </button>
                  ))}
                </div>
              ))}
            </aside>
            <section className="tj-panel">
              {lesson ? (
                <>
                  <h2 className="pl-title">{lesson.title}</h2>
                  {video ? (
                    <div className="learn-video">
                      <iframe
                        src={video}
                        title={lesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="pl-empty" style={{ marginBottom: 14 }}>
                      Geen video — tekstles.
                    </div>
                  )}
                  <p className="learn-body">{lesson.body}</p>
                  <button
                    type="button"
                    className="tb-addbtn"
                    disabled={busy}
                    onClick={() => void toggleDone()}
                  >
                    {done.has(lesson.id) ? "Markeer als open" : "Markeer als afgerond"}
                  </button>
                </>
              ) : (
                <div className="pl-empty">Kies een les.</div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  return (
    <MemberPage>
      <CourseInner courseId={courseId} />
    </MemberPage>
  );
}
