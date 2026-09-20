import { randomUUID } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { trackUsage } from "@/lib/billing/meter";
import { adminBucket } from "@/lib/firebase/admin";
import type { Course, CourseAsset } from "@/lib/platform/types";

export const COURSE_PDF_MAX = 25 * 1024 * 1024;
export const COURSE_VIDEO_MAX = 250 * 1024 * 1024;
const READ_MS = 1000 * 60 * 60 * 24 * 6;

const PDF_TYPES = new Set(["application/pdf"]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export type CourseAssetKind = "pdf" | "video";

function extOf(filename: string, contentType: string, kind: CourseAssetKind) {
  const fromName = filename.split(".").pop()?.toLowerCase() || "";
  if (kind === "pdf") return "pdf";
  if (fromName === "mov" || contentType === "video/quicktime") return "mov";
  if (fromName === "webm" || contentType === "video/webm") return "webm";
  return "mp4";
}

export function assertCourseAsset(input: {
  kind: CourseAssetKind;
  filename: string;
  contentType: string;
  size: number;
}) {
  const name = input.filename.trim();
  const type = (input.contentType || "").toLowerCase();
  if (!name) throw new ApiError("Filename is missing", 400);
  if (input.kind === "pdf") {
    const ok = PDF_TYPES.has(type) || name.toLowerCase().endsWith(".pdf");
    if (!ok) throw new ApiError("PDF only", 400);
    if (input.size > COURSE_PDF_MAX) {
      throw new ApiError("PDF must be 25 MB or smaller", 400);
    }
    return { contentType: type || "application/pdf", name };
  }
  const ok =
    VIDEO_TYPES.has(type) ||
    /\.(mp4|webm|mov)$/i.test(name);
  if (!ok) throw new ApiError("MP4, WebM or MOV only", 400);
  if (input.size > COURSE_VIDEO_MAX) {
    throw new ApiError("Video must be 250 MB or smaller", 400);
  }
  return { contentType: type || "video/mp4", name };
}

async function ensureCors() {
  try {
    await adminBucket().setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ["PUT", "GET", "HEAD", "OPTIONS"],
        origin: ["*"],
        responseHeader: ["Content-Type"],
      },
    ]);
  } catch (err) {
    console.warn("[course-assets] CORS not set", err);
  }
}

export async function createCourseAssetUpload(input: {
  kind: CourseAssetKind;
  filename: string;
  contentType: string;
  size: number;
}) {
  const checked = assertCourseAsset(input);
  const ext = extOf(checked.name, checked.contentType, input.kind);
  const path = `courses/${input.kind}/${randomUUID()}.${ext}`;
  await ensureCors();
  const file = adminBucket().file(path);
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 30 * 60 * 1000,
    contentType: checked.contentType,
  });
  const [readUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + READ_MS,
  });
  return {
    path,
    name: checked.name,
    contentType: checked.contentType,
    uploadUrl,
    url: readUrl,
  };
}

export async function saveCourseAssetBuffer(input: {
  kind: CourseAssetKind;
  filename: string;
  contentType: string;
  buffer: Buffer;
}) {
  const checked = assertCourseAsset({
    kind: input.kind,
    filename: input.filename,
    contentType: input.contentType,
    size: input.buffer.length,
  });
  const ext = extOf(checked.name, checked.contentType, input.kind);
  const path = `courses/${input.kind}/${randomUUID()}.${ext}`;
  const file = adminBucket().file(path);
  await file.save(input.buffer, {
    metadata: {
      contentType: checked.contentType,
      cacheControl: "private, max-age=3600",
    },
    resumable: false,
  });
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + READ_MS,
  });
  await trackUsage({ uploadBytes: input.buffer.length, writes: 1 });
  return {
    path,
    name: checked.name,
    contentType: checked.contentType,
    url,
  } satisfies CourseAsset;
}

export async function signCourseAsset(asset: CourseAsset): Promise<CourseAsset> {
  if (!asset.path) return asset;
  try {
    const [url] = await adminBucket().file(asset.path).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + READ_MS,
    });
    return { ...asset, url };
  } catch (err) {
    console.warn("[course-assets] sign failed", asset.path, err);
    return asset;
  }
}

export async function hydrateCourseAssets(course: Course): Promise<Course> {
  const chapters = await Promise.all(
    course.chapters.map(async (ch) => ({
      ...ch,
      lessons: await Promise.all(
        ch.lessons.map(async (lesson) => ({
          ...lesson,
          videoFile: lesson.videoFile
            ? await signCourseAsset(lesson.videoFile)
            : null,
          pdfs: await Promise.all(
            (lesson.pdfs || []).map((pdf) => signCourseAsset(pdf)),
          ),
        })),
      ),
    })),
  );
  return { ...course, chapters };
}
