"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createBacktest,
  deleteBacktest,
  fetchBacktests,
} from "@/lib/journal/api-client";
import type { TradeDirection } from "@/lib/journal/types";
import type { BacktestEntry } from "@/lib/backtest/types";

export function BacktestPanel({ readOnly = false }: { readOnly?: boolean }) {
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
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }

  useEffect(() => {
    load();
  }, []);

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
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="tj-eyebrow">JOURNAL</p>
      <h1 className="tj-title">Backtest-log</h1>
      <p className="pl-sub">
        Handmatige hypothese + resultaat in R. Geen strategie-engine, geen
        automatische orders.
      </p>
      {error && <div className="pl-empty">{error}</div>}
      {!readOnly && (
        <form className="tj-panel" onSubmit={(e) => void onSave(e)}>
          <div className="tj-grid3">
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
              <input
                className="tj-input"
                value={form.instrument}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instrument: e.target.value }))
                }
              />
            </div>
            <div className="tj-field">
              <div className="lbl">Richting</div>
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
            <div className="lbl">Hypothese</div>
            <textarea
              className="tj-input"
              rows={3}
              value={form.thesis}
              onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
              placeholder="Wat test je, en waarom?"
            />
          </div>
          <div className="tj-grid3">
            <div className="tj-field">
              <div className="lbl">Resultaat (R)</div>
              <input
                className="tj-input"
                value={form.resultR}
                onChange={(e) =>
                  setForm((f) => ({ ...f, resultR: e.target.value }))
                }
                placeholder="+1.5 of −1"
              />
            </div>
            <div className="tj-field" style={{ gridColumn: "span 2" }}>
              <div className="lbl">Notitie</div>
              <input
                className="tj-input"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <button className="tj-savebtn" type="submit" disabled={busy}>
            {busy ? "Opslaan…" : "Setup loggen"}
          </button>
        </form>
      )}
      <div className="tj-panel">
        {!rows.length ? (
          <div className="tj-empty">Nog geen backtests gelogd.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="bt-row">
              <div>
                <strong>
                  {r.date} · {r.instrument} · {r.direction}
                </strong>
                <p>{r.thesis}</p>
                {r.resultR ? <p>Resultaat: {r.resultR}R</p> : null}
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
                  Weg
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
