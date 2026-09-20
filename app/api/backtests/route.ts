import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAuthUser, requireSelfUid, resolveTargetUid } from "@/lib/auth/request";
import {
  createBacktest,
  deleteBacktest,
  listBacktests,
} from "@/lib/backtest/store";
import type { TradeDirection } from "@/lib/journal/types";
import { tRequest } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await resolveTargetUid(req, user);
    return NextResponse.json({ entries: await listBacktests(uid) });
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await requireSelfUid(req, user);
    const body = (await req.json()) as {
      date?: string;
      instrument?: string;
      direction?: TradeDirection;
      thesis?: string;
      resultR?: string;
      notes?: string;
    };
    if (!body.instrument || !body.thesis) {
      return jsonError(await tRequest("api.instrumentHypothesisRequired"));
    }
    const entry = await createBacktest(uid, {
      date: body.date || new Date().toISOString().slice(0, 10),
      instrument: body.instrument,
      direction: body.direction === "Short" ? "Short" : "Long",
      thesis: body.thesis,
      resultR: body.resultR,
      notes: body.notes,
    });
    return NextResponse.json(entry);
  });
}

export async function DELETE(req: Request) {
  return withApiError(async () => {
    const user = await requireAuthUser(req);
    const uid = await requireSelfUid(req, user);
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    if (!body.id) return jsonError(await tRequest("api.idRequired"));
    await deleteBacktest(uid, body.id);
    return NextResponse.json({ ok: true });
  });
}
