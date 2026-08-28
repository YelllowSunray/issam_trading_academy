import type { ReactNode } from "react";

function inlineFormat(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+?\*\*)/g);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

function stripMarks(s: string) {
  return s.replace(/^\*{1,2}\s*|\s*\*{1,2}$/g, "").trim();
}

export function splitAiSections(raw: string) {
  const text = raw.replace(/\r/g, "").trim();
  if (!text) return [];
  const header = /(?:^|\n)\s*\*{0,2}\s*(\d+)\.\s+(.+?)\*{0,2}\s*(?=\n|$)/g;
  const matches = [...text.matchAll(header)];
  if (matches.length < 2) {
    return [{ title: "", body: text.replace(/\*\*/g, "").trim() }];
  }
  return matches.map((m, i) => {
    const start = (m.index || 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index || text.length : text.length;
    return {
      title: stripMarks(m[2] || ""),
      body: text.slice(start, end).replace(/\*\*/g, "").trim(),
    };
  });
}

export function AiRichText({ text, className = "" }: { text: string; className?: string }) {
  const sections = splitAiSections(text);
  if (sections.length > 1 && sections.every((s) => s.title)) {
    return (
      <ol className={`ai-secs ${className}`.trim()}>
        {sections.map((s, i) => (
          <li key={`${s.title}-${i}`} className="ai-sec">
            <div className="ai-sec-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="ai-sec-copy">
              <div className="ai-sec-title">{s.title}</div>
              {s.body ? <p className="ai-sec-body">{inlineFormat(s.body)}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className={`ai-prose ${className}`.trim()}>
      {text
        .replace(/\*\*/g, "")
        .split(/\n{2,}/)
        .map((p, i) => (
          <p key={i}>{inlineFormat(p.trim())}</p>
        ))}
    </div>
  );
}
