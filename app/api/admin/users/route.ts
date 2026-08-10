import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import { listUsers } from "@/lib/users/store";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    const users = await listUsers();
    return NextResponse.json(users);
  });
}
