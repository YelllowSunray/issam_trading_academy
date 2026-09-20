import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import type { TradeDirection } from "@/lib/journal/types";
import {
  deleteSignal,
  listSignals,
  upsertSignal,
} from "@/lib/signals/store";
import type { SignalStatus } from "@/lib/signals/types";
import { writeAuditLog } from "@/lib/users/store";
import { tRequest } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    return NextResponse.json({ signals: await listSignals(80) });
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const body = (await req.json()) as {
      id?: string;
      instrument?: string;
      direction?: TradeDirection;
      entry?: string;
      sl?: string;
      tps?: string[];
      thesis?: string;
      status?: SignalStatus;
    };
    if (!body.instrument || !body.direction || !body.entry || !body.sl) {
      return jsonError(await tRequest("api.instrumentDirectionEntrySlRequired"));
    }
    const signal = await upsertSignal(
      {
        id: body.id,
        instrument: body.instrument,
        direction: body.direction,
        entry: body.entry,
        sl: body.sl,
        tps: body.tps,
        thesis: body.thesis,
        status: body.status,
      },
      admin.uid,
    );
    await writeAuditLog({
      actorUid: admin.uid,
      action: body.id ? "signal_update" : "signal_create",
      meta: { signalId: signal.id },
    });
    return NextResponse.json(signal);
  });
}

export async function DELETE(req: Request) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    if (!body.id) return jsonError(await tRequest("api.idRequired"));
    await deleteSignal(body.id);
    await writeAuditLog({
      actorUid: admin.uid,
      action: "signal_delete",
      meta: { signalId: body.id },
    });
    return NextResponse.json({ ok: true });
  });
}
