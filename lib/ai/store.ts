import { adminDb } from "@/lib/firebase/admin";
import { trackUsage } from "@/lib/billing/meter";
import { userRef } from "@/lib/users/store";
import { AI_LIMITS } from "./limits";
import { todayAmsterdam } from "./stats";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

export type DailyBrief = {
  date: string;
  body: string;
  createdAt: string;
  model: string;
  tradeCount?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

function dailyCol(uid: string) {
  return userRef(uid).collection("ai_daily");
}

function chatCol(uid: string) {
  return userRef(uid).collection("ai_chat");
}

function debriefCol(uid: string) {
  return userRef(uid).collection("ai_debriefs");
}

function usageRef(uid: string) {
  return userRef(uid).collection("private").doc("ai_usage");
}

export async function getDailyBrief(uid: string, date: string) {
  const snap = await dailyCol(uid).doc(date).get();
  await meter({ reads: 1 });
  return snap.exists ? (snap.data() as DailyBrief) : null;
}

export async function saveDailyBrief(uid: string, brief: DailyBrief) {
  await dailyCol(uid).doc(brief.date).set(brief);
  await meter({ writes: 1 });
}

export async function getDebrief(uid: string, tradeId: string) {
  const snap = await debriefCol(uid).doc(tradeId).get();
  await meter({ reads: 1 });
  return snap.exists
    ? (snap.data() as { body: string; createdAt: string })
    : null;
}

export async function saveDebrief(uid: string, tradeId: string, body: string) {
  const rec = { body, createdAt: new Date().toISOString() };
  await debriefCol(uid).doc(tradeId).set(rec);
  await meter({ writes: 1 });
  return rec;
}

export async function listChat(uid: string, limit = 16): Promise<ChatMessage[]> {
  const snap = await chatCol(uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
}

export async function addChat(
  uid: string,
  role: "user" | "assistant",
  content: string,
) {
  const rec = { role, content, createdAt: new Date().toISOString() };
  const ref = await chatCol(uid).add(rec);
  await meter({ writes: 1 });
  return { id: ref.id, ...rec };
}

export async function takeQuota(
  uid: string,
  kind: "chat" | "debrief" | "regen" | "admin",
  limit: number,
  date: string,
) {
  const ref = usageRef(uid);
  const snap = await ref.get();
  const data = (snap.data() || {}) as Record<string, string | number>;
  const dateKey = `${kind}Date`;
  const countKey = `${kind}Count`;
  const same = data[dateKey] === date;
  const count = same ? Number(data[countKey] || 0) : 0;
  if (count >= limit) return { ok: false as const, count };
  await ref.set(
    { [dateKey]: date, [countKey]: count + 1, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  await meter({ reads: 1, writes: 1 });
  return { ok: true as const, count: count + 1 };
}

export async function takeGroqCall(limit = AI_LIMITS.groqCallsPerOrg) {
  const date = todayAmsterdam();
  const ref = adminDb().collection("system").doc("ai_budget");
  const result = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.data() || {}) as { date?: string; calls?: number };
    const count = data.date === date ? Number(data.calls || 0) : 0;
    if (count >= limit) return { ok: false as const, count };
    tx.set(
      ref,
      { date, calls: count + 1, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return { ok: true as const, count: count + 1 };
  });
  await meter({ reads: 1, writes: 1 });
  return result;
}

