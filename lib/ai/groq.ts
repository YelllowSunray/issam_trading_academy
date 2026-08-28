import { ApiError } from "@/lib/api/errors";

const DEFAULT_MODEL = "openai/gpt-oss-20b";

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export async function groqChat(input: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new ApiError("GROQ_API_KEY ontbreekt", 500);

  const [first, ...rest] = input.messages;
  const messages =
    first?.role === "user"
      ? [
          { role: "user" as const, content: `${input.system}\n\n${first.content}` },
          ...rest,
        ]
      : [{ role: "user" as const, content: input.system }, ...input.messages];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL,
      temperature: input.temperature ?? 0.35,
      max_completion_tokens: input.maxTokens ?? 320,
      reasoning_effort: "low",
      messages,
    }),
  });

  const body = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
    error?: { message?: string };
  } | null;

  if (!res.ok) {
    throw new ApiError(body?.error?.message || `Groq ${res.status}`, 502);
  }
  const raw = body?.choices?.[0]?.message?.content;
  const text = Array.isArray(raw)
    ? raw.map((part) => part.text || "").join("").trim()
    : raw?.trim();
  if (!text) throw new ApiError("Groq gaf geen tekst terug", 502);
  return text;
}
