import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  // Vercel/UI sometimes stores the value wrapped in quotes
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

function loadCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const parsed = JSON.parse(json) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return {
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: normalizePrivateKey(parsed.private_key),
      }),
      projectId: parsed.project_id,
    };
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
    return {
      credential: cert({
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKeyRaw),
      }),
      projectId,
    };
  }

  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY on Vercel.",
  );
}

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const { credential, projectId } = loadCredential();
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  return initializeApp({
    credential,
    projectId,
    storageBucket,
  });
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export function adminBucket() {
  return getStorage(getAdminApp()).bucket();
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

/** Safe probe for deploy diagnostics (no secrets). */
export function getAdminConfigStatus() {
  const hasJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
  const hasProject = Boolean(
    (
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      ""
    ).trim(),
  );
  const hasEmail = Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim());
  const hasKey = Boolean(process.env.FIREBASE_PRIVATE_KEY?.trim());
  return {
    hasServiceAccountJson: hasJson,
    hasProjectId: hasProject,
    hasClientEmail: hasEmail,
    hasPrivateKey: hasKey,
    configured: hasJson || (hasProject && hasEmail && hasKey),
  };
}
