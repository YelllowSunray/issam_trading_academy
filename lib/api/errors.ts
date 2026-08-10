import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
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
