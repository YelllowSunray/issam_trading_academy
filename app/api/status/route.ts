import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { getStatus } from "@/lib/mt5/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    const { searchParams } = new URL(req.url);
    const login = searchParams.get("login");
    const status = await getStatus(login);
    return NextResponse.json(status);
  });
}
