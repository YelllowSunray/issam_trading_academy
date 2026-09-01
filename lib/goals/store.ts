import { randomUUID } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { trackUsage } from "@/lib/billing/meter";
import { userRef } from "@/lib/users/store";
import type { GoalItem } from "./types";

async function meter(delta: Parameters<typeof trackUsage>[0]) {
  try {
    await trackUsage(delta);
  } catch (err) {
    console.error("usage meter failed", err);
  }
}

function col(uid: string) {
  return userRef(uid).collection("goals");
}

export async function countGoals(uid: string): Promise<number> {
  const snap = await col(uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.size;
}

export async function countGoalsByUser(
  uids: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  await Promise.all(
    uids.map(async (uid) => {
      map.set(uid, await countGoals(uid));
    }),
  );
  return map;
}

export async function listGoals(uid: string): Promise<GoalItem[]> {
  const snap = await col(uid).get();
  await meter({ reads: Math.max(1, snap.size) });
  return snap.docs
    .map((d) => d.data() as GoalItem)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function upsertGoal(
  uid: string,
  input: Partial<GoalItem> & { title?: string },
): Promise<GoalItem> {
  const id = input.id || randomUUID();
  const existing = await col(uid).doc(id).get();
  const prev = existing.exists ? (existing.data() as GoalItem) : null;
  const title = (input.title ?? prev?.title ?? "").trim();
  if (!title) throw new ApiError("Titel is verplicht", 400);
  const rec: GoalItem = {
    id,
    title,
    done: input.done ?? prev?.done ?? false,
    order: input.order ?? prev?.order ?? Date.now(),
    createdAt: prev?.createdAt || new Date().toISOString(),
  };
  await col(uid).doc(id).set(rec);
  await meter({ writes: 1, reads: 1 });
  return rec;
}

export async function deleteGoal(uid: string, id: string) {
  await col(uid).doc(id).delete();
  await meter({ deletes: 1 });
}
