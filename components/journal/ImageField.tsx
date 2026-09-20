"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { resizeImage } from "@/lib/journal/image";
import { TJ_MAX_TRADE_IMAGES } from "@/lib/journal/types";
import { IconImage, IconX } from "./icons";

export function ImageField({
  images,
  onChange,
  max = TJ_MAX_TRADE_IMAGES,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const remaining = Math.max(0, max - images.length);

  return (
    <div className="tj-imgstack">
      {images.length > 0 ? (
        <div className="tj-imggrid">
          {images.map((src, i) => (
            <div className="tj-imgpreview" key={`${i}-${src.slice(0, 48)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Screenshot ${i + 1}`} />
              <button
                className="rm"
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
              >
                <IconX />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {remaining > 0 ? (
        <label className="tj-imgdrop">
          <IconImage />
          <span>
            {busy
              ? t("journal.processing")
              : images.length
                ? t("journal.addScreenshot")
                : t("journal.pickScreenshots")}
          </span>
          <span className="tj-imgdrop-hint">
            {t("journal.screenshotHint", { max })}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []).slice(0, remaining);
              e.target.value = "";
              if (!files.length) return;
              setBusy(true);
              try {
                const added: string[] = [];
                for (const file of files) {
                  added.push(await resizeImage(file));
                }
                onChange([...images, ...added]);
              } catch (err) {
                console.error("Couldn't process image", err);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
