"use client";

import { useState } from "react";
import { resizeImage } from "@/lib/journal/image";
import { IconImage, IconX } from "./icons";

export function ImageField({
  image,
  onChange,
}: {
  image: string | null;
  onChange: (value: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  if (image) {
    return (
      <div className="tj-imgpreview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Preview" />
        <button className="rm" type="button" onClick={() => onChange(null)}>
          <IconX />
        </button>
      </div>
    );
  }

  return (
    <label className="tj-imgdrop">
      <IconImage />
      <span>{busy ? "Verwerken…" : "Klik om een screenshot te kiezen"}</span>
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const dataUrl = await resizeImage(file);
            onChange(dataUrl);
          } catch (err) {
            console.error("Afbeelding verwerken mislukt", err);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
