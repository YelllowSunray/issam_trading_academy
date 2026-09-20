"use client";

import { FormEvent, useEffect, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import {
  createBacktest,
  deleteBacktest,
  fetchBacktests,
} from "@/lib/journal/api-client";
import { labelInstrument } from "@/lib/journal/format";
import type { TradeDirection } from "@/lib/journal/types";
import type { BacktestEntry } from "@/lib/backtest/types";

export function BacktestPanel({ readOnly = false }: { readOnly?: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<BacktestEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    instrument: "XAUUSD",
    direction: "Long" as TradeDirection,
    thesis: "",
    resultR: "",
    notes: "",
  });

  function load() {
    fetchBacktests()
      .then((d) => setRows(d.entries))
      .catch((e) => setError(e instanceof Error ? e.message : t("common.loadFailed")));
  }

  useEffect(() => {
    load();
  }, [t]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setBusy(true);
    setError(null);
    try {
      await createBacktest(form);
      setForm((f) => ({ ...f, thesis: "", resultR: "", notes: "" }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="tj-eyebrow">{t("nav.journal")}</p>
      <h1 className="tj-title">{t("journal.backtestTitle")}</h1>
      <p className="pl-sub">{t("journal.backtestLead")}</p>
      {error && <div className="pl-empty">{error}</div>}
      {!readOnly && (
        <form className="tj-panel" onSubmit={(e) => void onSave(e)}>
          <div className="tj-grid3">
            <div className="tj-field">
              <div className="lbl">{t("journal.date")}</div>
              <input
                type="date"
                className="tj-input"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="tj-field">
              <div className="lbl">{t("journal.instrument")}</div>
              <input
                className="tj-input"
                value={form.instrument}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instrument: e.target.value }))
                }
              />
            </div>
            <div className="tj-field">
              <div className="lbl">{t("journal.direction")}</div>
              <select
                className="tj-input"
                value={form.direction}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    direction: e.target.value as TradeDirection,
                  }))
                }
              >
                <option>Long</option>
                <option>Short</option>
              </select>
            </div>
          </div>
          <div className="tj-field">
            <div className="lbl">{t("journal.thesis")}</div>
            <textarea
              className="tj-input"
              rows={3}
              value={form.thesis}
              onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
              placeholder={t("journal.thesisPlaceholder")}
            />
          </div>
          <div className="tj-grid3">
            <div className="tj-field">
              <div className="lbl">{t("journal.resultR")}</div>
              <input
                className="tj-input"
                value={form.resultR}
                onChange={(e) =>
                  setForm((f) => ({ ...f, resultR: e.target.value }))
                }
                placeholder={t("journal.resultPlaceholder")}
              />
            </div>
            <div className="tj-field" style={{ gridColumn: "span 2" }}>
              <div className="lbl">{t("journal.note")}</div>
              <input
                className="tj-input"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <button className="tj-savebtn" type="submit" disabled={busy}>
            {busy ? t("common.saving") : t("journal.logSetup")}
          </button>
        </form>
      )}
      <div className="tj-panel">
        {!rows.length ? (
          <div className="tj-empty">{t("journal.noBacktests")}</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="bt-row">
              <div>
                <strong>
                  {r.date} · {labelInstrument(r.instrument, t("journal.other"))} · {r.direction}
                </strong>
                <p>{r.thesis}</p>
                {r.resultR ? <p>{t("journal.result", { r: r.resultR })}</p> : null}
                {r.notes ? <p className="pl-sub2">{r.notes}</p> : null}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="pl-reset-btn"
                  onClick={async () => {
                    await deleteBacktest(r.id);
                    load();
                  }}
                >
                  {t("common.remove")}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
