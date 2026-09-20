import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import { api2tradeConfigured, getVendorAccounts } from "@/lib/api2trade/client";
import {
  mapExistingAccount,
  registerStudentAccount,
} from "@/lib/api2trade/sync";
import {
  ensureSeedAccount,
  listCloudAccounts,
  seedConfig,
  toCloudRows,
} from "@/lib/api2trade/store";
import { writeAuditLog } from "@/lib/users/store";
import { tRequest } from "@/lib/i18n/server";

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    await ensureSeedAccount();
    const configured = api2tradeConfigured();
    const records = await listCloudAccounts();
    let vendor: Awaited<ReturnType<typeof getVendorAccounts>> = [];
    let vendorError: string | null = null;
    if (configured) {
      try {
        vendor = await getVendorAccounts();
      } catch (err) {
        vendorError = err instanceof Error ? err.message : await tRequest("api.getAccountsFailed");
      }
    }
    return NextResponse.json({
      configured,
      seed: seedConfig(),
      vendor,
      vendorError,
      accounts: await toCloudRows(records, vendor),
    });
  });
}

export async function POST(req: Request) {
  return withApiError(async () => {
    const admin = await requireAdmin(req);
    if (!api2tradeConfigured()) {
      return jsonError(await tRequest("api.api2tradeKeyMissing"), 500);
    }
    const body = (await req.json()) as {
      mode?: "register" | "map";
      email?: string;
      login?: string;
      password?: string;
      server?: string;
      name?: string;
      platform?: "Metatrader 5" | "Metatrader 4";
      accountId?: string;
    };
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return jsonError(await tRequest("api.emailRequired"));

    if (body.mode === "map" || body.accountId) {
      const result = await mapExistingAccount({
        email,
        accountId: body.accountId || "",
        login: body.login,
        actorUid: admin.uid,
      });
      await writeAuditLog({
        actorUid: admin.uid,
        action: "cloud_account_mapped",
        meta: { email, accountId: result.accountId },
      });
      return NextResponse.json({ ok: true, result });
    }

    const result = await registerStudentAccount({
      email,
      login: body.login || "",
      password: body.password || "",
      server: body.server || "",
      name: body.name,
      platform: body.platform,
      actorUid: admin.uid,
    });
    await writeAuditLog({
      actorUid: admin.uid,
      action: "cloud_account_registered",
      meta: { email, accountId: result.accountId, login: result.login },
    });
    return NextResponse.json({ ok: true, result });
  });
}
