"use client";

import { useEffect } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconX } from "./icons";

export function Lightbox({
  urls,
  index,
  onClose,
  onIndex,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const t = useT();
  const total = urls.length;
  const current = total ? Math.min(Math.max(index, 0), total - 1) : 0;
  const src = urls[current];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (total < 2) return;
      if (e.key === "ArrowLeft") onIndex((current - 1 + total) % total);
      if (e.key === "ArrowRight") onIndex((current + 1) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, onClose, onIndex, total]);

  if (!src) return null;

  return (
    <div
      className="tj-lightbox-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {total > 1 ? (
        <button
          className="tj-lightbox-nav prev"
          type="button"
          onClick={() => onIndex((current - 1 + total) % total)}
          aria-label={t("journal.prevPhoto")}
        >
          ‹
        </button>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`Setup screenshot ${current + 1}`} />
      {total > 1 ? (
        <button
          className="tj-lightbox-nav next"
          type="button"
          onClick={() => onIndex((current + 1) % total)}
          aria-label={t("journal.nextPhoto")}
        >
          ›
        </button>
      ) : null}
      {total > 1 ? (
        <div className="tj-lightbox-count">
          {current + 1} / {total}
        </div>
      ) : null}
      <button className="tj-lightbox-close" onClick={onClose} type="button">
        <IconX />
      </button>
    </div>
  );
}
