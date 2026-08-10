"use client";

import { useMemo, useState } from "react";
import { TJ_INSTRUMENTS, TJ_SMC_TAGS } from "@/lib/journal/constants";
import type { TradeDirection } from "@/lib/journal/types";
import { ImageField } from "./ImageField";
import { IconX } from "./icons";

type FormState = {
  date: string;
  instrument: string;
  direction: TradeDirection;
  entry: string;
  sl: string;
  exit: string;
  riskEur: string;
  tags: string[];
  notes: string;
  image: string | null;
};

function defaultForm(): FormState {
  return {
    date: new Date().toISOString().slice(0, 10),
    instrument: "XAUUSD",
    direction: "Long",
    entry: "",
    sl: "",
    exit: "",
    riskEur: "",
    tags: [],
    notes: "",
    image: null,
  };
}

export function TradeModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (trade: {
    date: string;
    instrument: string;
    direction: TradeDirection;
    entry: string;
    sl: string;
    exit: string;
    riskEur: string | null;
    tags: string[];
    notes: string;
    imageDataUrl: string | null;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const canSave = useMemo(
    () => Boolean(form.entry && form.sl && form.exit),
    [form.entry, form.sl, form.exit],
  );

  return (
    <div
      className="tj-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tj-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tj-modal-head">
          <div>Nieuwe trade</div>
          <button type="button" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="tj-field">
          <div className="lbl">Datum</div>
          <input
            type="date"
            className="tj-input"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>

        <div className="tj-field">
          <div className="lbl">Instrument</div>
          <select
            className="tj-input"
            value={form.instrument}
            onChange={(e) =>
              setForm((f) => ({ ...f, instrument: e.target.value }))
            }
          >
            {TJ_INSTRUMENTS.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </div>

        <div className="tj-field">
          <div className="lbl">Richting</div>
          <div className="tj-dirrow">
            {(["Long", "Short"] as TradeDirection[]).map((dir) => (
              <button
                key={dir}
                type="button"
                className={`tj-dirbtn${form.direction === dir ? " active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, direction: dir }))}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

        <div className="tj-grid3">
          <div className="tj-field">
            <div className="lbl">Entry</div>
            <input
              type="number"
              step="any"
              className="tj-input"
              placeholder="0.00"
              value={form.entry}
              onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
            />
          </div>
          <div className="tj-field">
            <div className="lbl">Stop loss</div>
            <input
              type="number"
              step="any"
              className="tj-input"
              placeholder="0.00"
              value={form.sl}
              onChange={(e) => setForm((f) => ({ ...f, sl: e.target.value }))}
            />
          </div>
          <div className="tj-field">
            <div className="lbl">Exit</div>
            <input
              type="number"
              step="any"
              className="tj-input"
              placeholder="0.00"
              value={form.exit}
              onChange={(e) => setForm((f) => ({ ...f, exit: e.target.value }))}
            />
          </div>
        </div>

        <div className="tj-field">
          <div className="lbl">Risico in € (optioneel)</div>
          <input
            type="number"
            step="any"
            className="tj-input"
            placeholder="bv. 50"
            value={form.riskEur}
            onChange={(e) => setForm((f) => ({ ...f, riskEur: e.target.value }))}
          />
          <div className="hint">
            Nodig om deze trade mee te tellen in het P&amp;L Dashboard (€ = R ×
            risico).
          </div>
        </div>

        <div className="tj-field">
          <div className="lbl">SMC setup</div>
          <div className="tj-tagrow">
            {TJ_SMC_TAGS.map((tag) => {
              const active = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tj-tagbtn${active ? " active" : ""}`}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      tags: active
                        ? f.tags.filter((t) => t !== tag)
                        : [...f.tags, tag],
                    }))
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tj-field">
          <div className="lbl">Notities</div>
          <textarea
            className="tj-input"
            style={{ minHeight: 70, resize: "vertical" }}
            placeholder="Bias, reden voor entry, emotie tijdens de trade..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="tj-field">
          <div className="lbl">Setup screenshot</div>
          <ImageField
            image={form.image}
            onChange={(image) => setForm((f) => ({ ...f, image }))}
          />
        </div>

        <button
          className="tj-savebtn"
          type="button"
          disabled={!canSave || saving}
          onClick={async () => {
            if (!canSave) return;
            setSaving(true);
            try {
              await onSave({
                date: form.date,
                instrument: form.instrument,
                direction: form.direction,
                entry: form.entry,
                sl: form.sl,
                exit: form.exit,
                riskEur: form.riskEur || null,
                tags: form.tags,
                notes: form.notes,
                imageDataUrl: form.image,
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Opslaan…" : "Trade opslaan"}
        </button>
      </div>
    </div>
  );
}
