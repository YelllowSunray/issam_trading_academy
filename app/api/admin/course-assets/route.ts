import { NextResponse } from "next/server";
import { jsonError, withApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/request";
import {
  COURSE_PDF_MAX,
  createCourseAssetUpload,
  saveCourseAssetBuffer,
  type CourseAssetKind,
} from "@/lib/courses/assets";

export const maxDuration = 60;

function asKind(value: unknown): CourseAssetKind | null {
  return value === "pdf" || value === "video" ? value : null;
}

export async function POST(req: Request) {
  return withApiError(async () => {
    await requireAdmin(req);
    const type = req.headers.get("content-type") || "";
    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const kind = asKind(form.get("kind"));
      const file = form.get("file");
      if (!kind || !(file instanceof File)) {
        return jsonError("kind en file zijn verplicht");
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (kind === "video" && buffer.length > COURSE_PDF_MAX) {
        return jsonError(
          "Grote video’s via directe upload. Kies het bestand opnieuw.",
        );
      }
      const asset = await saveCourseAssetBuffer({
        kind,
        filename: file.name,
        contentType: file.type,
        buffer,
      });
      return NextResponse.json(asset);
    }

    const body = (await req.json()) as {
      kind?: unknown;
      filename?: string;
      contentType?: string;
      size?: number;
    };
    const kind = asKind(body.kind);
    if (!kind) return jsonError("kind moet pdf of video zijn");
    const prepared = await createCourseAssetUpload({
      kind,
      filename: body.filename || "",
      contentType: body.contentType || "",
      size: Number(body.size || 0),
    });
    return NextResponse.json(prepared);
  });
}
