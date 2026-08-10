import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function withApiError(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof ApiError) {
      return jsonError(err.message, err.status);
    }
    // Legacy: some paths still throw Response
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "server error";
    console.error("[api]", message, err);
    return jsonError(message, 500);
  }
}
