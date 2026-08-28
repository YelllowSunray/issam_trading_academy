"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  fetchAiChat,
  fetchDailyBrief,
  regenerateDailyBrief,
  sendAiChat,
  type AiChatMessage,
  type DailyBrief,
} from "@/lib/journal/api-client";

export function AiCoach({ readOnly = false }: { readOnly?: boolean }) {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDailyBrief()
      .then(setBrief)
      .catch((e) => setError(e instanceof Error ? e.message : "AI laden mislukt"))
      .finally(() => setLoading(false));
    fetchAiChat()
      .then((r) => setMessages(r.messages || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  async function refreshBrief() {
    setBusy(true);
    setError(null);
    try {
      setBrief(await regenerateDailyBrief());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Genereren mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function onChat(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    const text = question.trim();
    if (!text) return;
    setQuestion("");
    setBusy(true);
    setError(null);
    try {
      const msg = await sendAiChat(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        },
        msg,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ai-shell">
      <div className="ai-brief">
        <div className="ai-kicker">AI · DAGBRIEFING</div>
        <div className="ai-brief-head">
          <h2>Journal-coach</h2>
          {!readOnly && (
            <button
              type="button"
              className="pl-reset-btn"
              disabled={busy}
              onClick={() => void refreshBrief()}
            >
              {busy ? "…" : "Opnieuw"}
            </button>
          )}
        </div>
        {loading ? (
          <p className="ai-body dim">Briefing laden…</p>
        ) : brief?.body ? (
          <p className="ai-body">{brief.body}</p>
        ) : (
          <p className="ai-body dim">Nog geen briefing. Klik Opnieuw om er een te maken.</p>
        )}
        <p className="ai-legal">
          Educatie over jouw journal. Geen beleggingsadvies, geen signalen.
        </p>
      </div>
      <div className="ai-chat">
        <div className="ai-kicker">CHAT · 5 / DAG</div>
        <div className="ai-thread" ref={scroller}>
          {messages.map((m) => (
            <div key={m.id} className={`ai-msg ${m.role}`}>
              {m.content}
            </div>
          ))}
          {!messages.length && (
            <div className="ai-msg assistant dim">
              Vraag over jouw fouten, winrate of proces. Geen “moet ik long?”.
            </div>
          )}
        </div>
        {error && <div className="ai-error">{error}</div>}
        <form onSubmit={(e) => void onChat(e)} className="ai-form">
          <input
            className="tj-input"
            value={question}
            disabled={readOnly || busy}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={readOnly ? "Alleen-lezen in coach-view" : "Vraag over je journal…"}
          />
          <button className="tb-addbtn" type="submit" disabled={readOnly || busy}>
            Stuur
          </button>
        </form>
      </div>
    </section>
  );
}
