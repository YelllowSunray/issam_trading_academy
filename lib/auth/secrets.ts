import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function generateIngestSecret() {
  return randomBytes(32).toString("base64url");
}

export function hashIngestSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function secretsEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
