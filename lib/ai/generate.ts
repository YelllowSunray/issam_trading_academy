import { ApiError } from "@/lib/api/errors";
import { groqChat } from "./groq";
import { AI_LIMITS } from "./limits";
import {
  COACH_RULES,
  SIGNAL_REFUSAL,
  coachBriefPrompt,
  dailyPrompt,
  debriefPrompt,
  emptyDailyBrief,
  EMPTY_CHAT,
  looksLikeSignalAsk,
} from "./prompts";
import { buildSnapshot, compactSnapshot, loadUserJournal, todayAmsterdam } from "./stats";
import { getUserProfile } from "@/lib/users/store";
import { listAccounts } from "@/lib/mt5/store";
import {
  addChat,
  getDailyBrief,
  getDebrief,
  listChat,
  saveDailyBrief,
  saveDebrief,
  takeGroqCall,
  takeQuota,
  type DailyBrief,
} from "./store";

const MODEL = () => process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";

const ORG_LIMIT =
  "AI-daglimiet bereikt (free tier). Probeer morgen opnieuw.";

async function reserveGroq() {
  const org = await takeGroqCall();
  if (!org.ok) throw new ApiError(ORG_LIMIT, 429);
}

export async function ensureDailyBrief(
  uid: string,
  force = false,
): Promise<DailyBrief> {
  const date = todayAmsterdam();
  const existing = await getDailyBrief(uid, date);
  const [trades, profile, accounts] = await Promise.all([
    loadUserJournal(uid),
    getUserProfile(uid),
    listAccounts(uid),
  ]);
  const owner = profile?.displayName || profile?.email || "dit journal";
  const snap = buildSnapshot(trades, {
    owner,
    logins: accounts.map((a) => a.login),
  });
  const stale =
    existing &&
    !force &&
    ((existing.tradeCount ?? 0) !== snap.totals.trades ||
      (snap.empty && existing.model !== "empty-journal"));
  if (existing && !force && !stale) return existing;
  if (existing && force) {
    const regen = await takeQuota(uid, "regen", AI_LIMITS.regenPerUser, date);
    if (!regen.ok) {
      throw new ApiError("Je kunt de briefing 1× per dag opnieuw maken.", 429);
    }
  }
  if (snap.empty) {
    const brief: DailyBrief = {
      date,
      body: emptyDailyBrief(owner, date),
      createdAt: new Date().toISOString(),
      model: "empty-journal",
      tradeCount: 0,
    };
    await saveDailyBrief(uid, brief);
    return brief;
  }
  await reserveGroq();
  const body = await groqChat({
    system: COACH_RULES,
    messages: [{ role: "user", content: dailyPrompt(snap) }],
    maxTokens: AI_LIMITS.tokens.daily,
  });
  const brief: DailyBrief = {
    date,
    body,
    createdAt: new Date().toISOString(),
    model: MODEL(),
    tradeCount: snap.totals.trades,
  };
  await saveDailyBrief(uid, brief);
  return brief;
}

export async function debriefTrade(uid: string, tradeId: string) {
  const existing = await getDebrief(uid, tradeId);
  if (existing) return existing;
  const quota = await takeQuota(
    uid,
    "debrief",
    AI_LIMITS.debriefPerUser,
    todayAmsterdam(),
  );
  if (!quota.ok) {
    throw new ApiError(
      `Daglimiet voor debriefs bereikt (${AI_LIMITS.debriefPerUser}).`,
      429,
    );
  }
  const trades = await loadUserJournal(uid);
  const trade = trades.find((t) => t.id === tradeId);
  if (!trade) throw new ApiError("trade niet gevonden", 404);
  await reserveGroq();
  const body = await groqChat({
    system: COACH_RULES,
    messages: [
      {
        role: "user",
        content: debriefPrompt({
          date: trade.date,
          instrument: trade.instrument,
          direction: trade.direction,
          eur: trade.eur ?? null,
          r: trade.r ?? null,
          notes: (trade.notes || "").slice(0, AI_LIMITS.noteChars),
        }),
      },
    ],
    maxTokens: AI_LIMITS.tokens.debrief,
  });
  return saveDebrief(uid, tradeId, body);
}

export async function chatWithJournal(uid: string, question: string) {
  const text = question.trim().slice(0, AI_LIMITS.questionMax);
  if (text.length < 2) throw new ApiError("vraag te kort");
  if (looksLikeSignalAsk(text)) {
    await addChat(uid, "user", text);
    return addChat(uid, "assistant", SIGNAL_REFUSAL);
  }
  const quota = await takeQuota(
    uid,
    "chat",
    AI_LIMITS.chatPerUser,
    todayAmsterdam(),
  );
  if (!quota.ok) {
    throw new ApiError(
      `Daglimiet voor chat bereikt (${AI_LIMITS.chatPerUser}).`,
      429,
    );
  }
  await addChat(uid, "user", text);
  const [trades, profile, accounts, history] = await Promise.all([
    loadUserJournal(uid),
    getUserProfile(uid),
    listAccounts(uid),
    listChat(uid, AI_LIMITS.chatHistory + 2),
  ]);
  const snap = buildSnapshot(trades, {
    owner: profile?.displayName || profile?.email || "dit journal",
    logins: accounts.map((a) => a.login),
  });
  if (snap.empty) {
    return addChat(uid, "assistant", EMPTY_CHAT);
  }
  await reserveGroq();
  const messages = history
    .filter((m) => m.content)
    .slice(-AI_LIMITS.chatHistory)
    .map((m) => ({ role: m.role, content: m.content }));
  if (messages.at(-1)?.content !== text) {
    messages.push({ role: "user", content: text });
  }
  const reply = await groqChat({
    system: `${COACH_RULES}\n${compactSnapshot(snap)}`,
    messages,
    maxTokens: AI_LIMITS.tokens.chat,
  });
  return addChat(uid, "assistant", reply);
}

export async function coachBrief(
  uid: string,
  displayName: string,
  adminUid: string,
) {
  const [trades, accounts] = await Promise.all([
    loadUserJournal(uid),
    listAccounts(uid),
  ]);
  const snap = buildSnapshot(trades, {
    owner: displayName,
    logins: accounts.map((a) => a.login),
  });
  if (snap.empty) {
    return `${displayName} heeft nog geen trades in dit journal. Geen patronen of risico om te reviewen. Eerst MT5 koppelen of handmatig loggen.`;
  }
  const quota = await takeQuota(
    adminUid,
    "admin",
    AI_LIMITS.adminBriefPerDay,
    todayAmsterdam(),
  );
  if (!quota.ok) {
    throw new ApiError(
      `Daglimiet voor AI-briefs bereikt (${AI_LIMITS.adminBriefPerDay}).`,
      429,
    );
  }
  await reserveGroq();
  return groqChat({
    system: COACH_RULES,
    messages: [{ role: "user", content: coachBriefPrompt(snap, displayName) }],
    maxTokens: AI_LIMITS.tokens.coach,
  });
}
