"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MemberPage } from "@/components/platform/MemberPage";
import { fetchCourse, fetchProgress, setProgress } from "@/lib/journal/api-client";
import type { Course, LessonProgress } from "@/lib/platform/types";

function embedUrl(url: string) {
  if (!url) return null;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const yt = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?.*v=))([\w-]{6,})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
}

function CourseInner({ courseId }: { courseId: string }) {
  const { profile, asUser } = useAuth();
  const readOnly = Boolean(asUser && asUser !== profile?.uid);
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
  }, [courseId, asUser]);

  const done = useMemo(() => new Set(progress.map((p) => p.lessonId)), [progress]);
  const lesson = course?.chapters
    .flatMap((ch) => ch.lessons)
    .find((l) => l.id === active);
  const embed = lesson ? embedUrl(lesson.videoUrl) : null;
  const fileVideo = lesson?.videoFile?.url || "";
  const pdfs = lesson?.pdfs?.filter((p) => p.url) || [];

  async function toggleDone() {
    if (readOnly || !course || !lesson) return;
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
                      <span className="learn-lesson-meta">
                        {l.videoFile || embedUrl(l.videoUrl) ? "video" : ""}
                        {(l.pdfs || []).length
                          ? `${l.videoFile || embedUrl(l.videoUrl) ? " · " : ""}${(l.pdfs || []).length} pdf`
                          : ""}
                      </span>
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
                  {fileVideo ? (
                    <div className="learn-video">
                      <video src={fileVideo} controls playsInline preload="metadata" />
                    </div>
                  ) : embed ? (
                    <div className="learn-video">
                      <iframe
                        src={embed}
                        title={lesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="pl-empty" style={{ marginBottom: 14 }}>
                      Geen video bij deze les.
                    </div>
                  )}
                  {pdfs.length ? (
                    <div className="learn-pdfs">
                      <div className="ttl">PDF-materiaal</div>
                      {pdfs.map((pdf) => (
                        <a
                          key={pdf.path || pdf.url}
                          href={pdf.url}
                          target="_blank"
                          rel="noreferrer"
                          className="learn-pdf"
                        >
                          {pdf.name || "PDF"}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <p className="learn-body">{lesson.body}</p>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="tb-addbtn"
                      disabled={busy}
                      onClick={() => void toggleDone()}
                    >
                      {done.has(lesson.id) ? "Markeer als open" : "Markeer als afgerond"}
                    </button>
                  ) : (
                    <p className="pl-sub2">Voortgang van deze student — alleen-lezen.</p>
                  )}
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
