import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { listAccounts } from "@/lib/mt5/store";

export async function GET() {
  return withApiError(async () => {
    const accounts = await listAccounts();
    return NextResponse.json(accounts);
  });
}
