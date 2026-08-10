import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function assertMt5Secret(req: Request) {
  const expected = process.env.MT5_INGEST_SECRET?.trim();
  if (!expected) return;
  const got = req.headers.get("x-mt5-secret");
  if (got !== expected) {
    throw new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function withApiError(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "server error";
    console.error(message);
    return jsonError(message, 500);
  }
}
