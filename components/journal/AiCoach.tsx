"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import {
  fetchAiChat,
  fetchDailyBrief,
  regenerateDailyBrief,
  sendAiChat,
  type AiChatMessage,
  type DailyBrief,
} from "@/lib/journal/api-client";
import { AiRichText } from "./AiRichText";

export function AiCoach({ readOnly = false }: { readOnly?: boolean }) {
  const t = useT();
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
      .catch((e) => setError(e instanceof Error ? e.message : t("ai.loadFailed")))
      .finally(() => setLoading(false));
    fetchAiChat()
      .then((r) => setMessages(r.messages || []))
      .catch(() => {});
  }, [t]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  async function refreshBrief() {
    setBusy(true);
    setError(null);
    try {
      setBrief(await regenerateDailyBrief());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ai.genFailed"));
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
      setError(err instanceof Error ? err.message : t("ai.chatFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ai-shell">
      <div className="ai-brief">
        <div className="ai-brief-head">
          <div>
            <div className="ai-kicker">{t("ai.kicker")}</div>
            <h2>{t("ai.title")}</h2>
          </div>
          {!readOnly && (
            <button
              type="button"
              className="pl-reset-btn"
              disabled={busy}
              onClick={() => void refreshBrief()}
            >
              {busy ? "…" : t("ai.again")}
            </button>
          )}
        </div>
        {loading ? (
          <p className="ai-body dim">{t("ai.loading")}</p>
        ) : brief?.body ? (
          <AiRichText text={brief.body} />
        ) : (
          <p className="ai-body dim">
            {readOnly ? t("ai.noneRead") : t("ai.none")}
          </p>
        )}
        <p className="ai-legal">{t("ai.legal")}</p>
      </div>
      <div className="ai-chat">
        <div className="ai-kicker">
          {readOnly ? t("ai.chatRead") : t("ai.chatLimit")}
        </div>
        <div className="ai-thread" ref={scroller}>
          {messages.map((m) => (
            <div key={m.id} className={`ai-msg ${m.role}`}>
              {m.role === "assistant" ? (
                <AiRichText text={m.content} />
              ) : (
                m.content
              )}
            </div>
          ))}
          {!messages.length && (
            <div className="ai-empty-chat">
              {readOnly ? t("ai.emptyRead") : t("ai.empty")}
            </div>
          )}
        </div>
        {error && <div className="ai-error">{error}</div>}
        {readOnly ? (
          <p className="ai-legal">{t("ai.youSee")}</p>
        ) : (
          <form onSubmit={(e) => void onChat(e)} className="ai-form">
            <input
              className="tj-input"
              value={question}
              disabled={busy}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("ai.placeholder")}
            />
            <button className="tb-addbtn" type="submit" disabled={busy}>
              {t("ai.send")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
