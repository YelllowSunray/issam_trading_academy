import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser, requireSelfUid, resolveTargetUid } from "@/lib/auth/request";
import { deleteGoal, listGoals, upsertGoal } from "@/lib/goals/store";
import { tRequest } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    return NextResponse.json({ goals: await listGoals(uid) });
  });
}

export async function PUT(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await requireSelfUid(req, user);
    const body = (await req.json()) as {
      id?: string;
      title?: string;
      done?: boolean;
      order?: number;
    };
    const goal = await upsertGoal(uid, body);
    return NextResponse.json(goal);
  });
}

export async function DELETE(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await requireSelfUid(req, user);
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    if (!body.id) return jsonError(await tRequest("api.idRequired"));
    await deleteGoal(uid, body.id);
    return NextResponse.json({ ok: true });
  });
}
