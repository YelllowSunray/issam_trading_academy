"use client";

import { IconX } from "./icons";

export function Lightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  return (
    <div
      className="tj-lightbox-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Setup screenshot" />
      <button className="tj-lightbox-close" onClick={onClose} type="button">
        <IconX />
      </button>
    </div>
  );
}
