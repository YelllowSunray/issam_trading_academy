"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MemberPage } from "@/components/platform/MemberPage";
import { fetchCourses, fetchProgress } from "@/lib/journal/api-client";
import type { Course, LessonProgress } from "@/lib/platform/types";

function LearnInner() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCourses(), fetchProgress()])
      .then(([c, p]) => {
        setCourses(c);
        setProgress(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, []);

  const done = new Set(progress.map((p) => p.lessonId));

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">EDUCATIE</p>
      <h1 className="tj-title">Cursussen</h1>
      <p className="pl-sub">
        Video + korte samenvatting per les. Voortgang wordt per account
        bijgehouden.
      </p>
      {error && <div className="pl-empty">{error}</div>}
      <div className="plat-card-grid">
        {courses.map((course) => {
          const total = course.chapters.reduce((s, ch) => s + ch.lessons.length, 0);
          const completed = course.chapters
            .flatMap((ch) => ch.lessons)
            .filter((l) => done.has(l.id)).length;
          return (
            <Link key={course.id} href={`/learn/${course.id}`} className="plat-card">
              <div className="pl-label">Cursus</div>
              <h2>{course.title}</h2>
              <p>{course.description || "Geen beschrijving"}</p>
              <div className="plat-progress">
                <div
                  className="plat-progress-fill"
                  style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
                />
              </div>
              <div className="pl-sub2">
                {completed}/{total} lessen · {course.chapters.length} hoofdstukken
              </div>
            </Link>
          );
        })}
      </div>
      {!courses.length && !error && (
        <div className="pl-empty">
          Nog geen gepubliceerde cursussen. Admins kunnen modules aanmaken in
          Admin → Cursussen.
        </div>
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
