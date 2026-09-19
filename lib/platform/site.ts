/** Canonical production domain. */
export const SITE_HOST = "tradechain.me";
export const SITE_URL = `https://${SITE_HOST}`;

export function publicSiteUrl() {
  const fromEnv = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return SITE_URL;
  return "";
}

export function appOrigin(req: Request) {
  const configured = publicSiteUrl();
  if (configured) return configured;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host.split(",")[0].trim()}`;
  return new URL(req.url).origin;
}
