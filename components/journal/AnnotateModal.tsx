"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { TJ_SMC_TAGS } from "@/lib/journal/constants";
import { fmtEur, labelInstrument } from "@/lib/journal/format";
import { tradeImageUrls, type Mt5Trade, type TradeAnnotation } from "@/lib/journal/types";
import { ImageField } from "./ImageField";
import { IconX } from "./icons";

export function AnnotateModal({
  trade,
  initial,
  onClose,
  onSave,
}: {
  trade: Mt5Trade;
  initial: TradeAnnotation;
  onClose: () => void;
  onSave: (ann: TradeAnnotation) => Promise<void>;
}) {
  const t = useT();
  const [tags, setTags] = useState(initial.tags || []);
  const [notes, setNotes] = useState(initial.notes || "");
  const [images, setImages] = useState(() => tradeImageUrls(initial));
  const [saving, setSaving] = useState(false);
  const eurTxt =
    trade.profitEur != null ? fmtEur(trade.profitEur) : "—";
  const eurColor =
    (trade.profitEur ?? 0) >= 0 ? "var(--bull)" : "var(--bear)";

  return (
    <div
      className="tj-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tj-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tj-modal-head">
          <div>{t("journal.annotate")}</div>
          <button type="button" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="tj-field">
          <div className="lbl">{t("journal.trade")}</div>
          <div style={{ fontSize: 13, color: "var(--paper-dim)" }}>
            {trade.date} · {labelInstrument(trade.instrument, t("journal.other"))}{" "}
            {trade.direction} ·{" "}
            <span style={{ color: eurColor, fontWeight: 700 }}>{eurTxt}</span>
          </div>
        </div>

        <div className="tj-field">
          <div className="lbl">{t("journal.smcSetup")}</div>
          <div className="tj-tagrow">
            {TJ_SMC_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tj-tagbtn${active ? " active" : ""}`}
                  onClick={() =>
                    setTags((prev) =>
                      active ? prev.filter((item) => item !== tag) : [...prev, tag],
                    )
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tj-field">
          <div className="lbl">{t("journal.notes")}</div>
          <textarea
            className="tj-input"
            style={{ minHeight: 70, resize: "vertical" }}
            placeholder={t("journal.annotatePlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="tj-field">
          <div className="lbl">{t("journal.screenshots")}</div>
          <ImageField images={images} onChange={setImages} />
        </div>

        <button
          className="tj-savebtn"
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                tags,
                notes,
                imageUrl: images[0] || null,
                imageUrls: images,
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
