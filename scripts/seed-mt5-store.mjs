/**
 * One-time import of Trading-Journal-Dashboard--main/mt5_trades_store.json
 * into Firestore via the Admin SDK.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-mt5-store.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const storePath = join(
  root,
  "Trading-Journal-Dashboard--main",
  "mt5_trades_store.json",
);

function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return {
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      }),
      projectId: parsed.project_id,
    };
  }
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials in env");
  }
  return {
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  };
}

if (!getApps().length) {
  const { credential, projectId } = loadCredential();
  initializeApp({ credential, projectId });
}

const db = getFirestore();
const raw = JSON.parse(readFileSync(storePath, "utf8"));

async function seed() {
  if (Array.isArray(raw)) {
    const login = "onbekend";
    await db.collection("mt5_accounts").doc(login).set({
      info: null,
      last_heartbeat: null,
      last_trade_sync: null,
    });
    for (let i = 0; i < raw.length; i += 400) {
      const batch = db.batch();
      raw.slice(i, i + 400).forEach((t) => {
        if (!t?.id) return;
        batch.set(
          db.collection("mt5_accounts").doc(login).collection("trades").doc(t.id),
          t,
        );
      });
      await batch.commit();
    }
    console.log(`Seeded legacy list into account ${login}`);
    return;
  }

  for (const [login, acc] of Object.entries(raw)) {
    await db
      .collection("mt5_accounts")
      .doc(login)
      .set({
        info: acc.info ?? null,
        last_heartbeat: acc.last_heartbeat ?? null,
        last_trade_sync: acc.last_trade_sync ?? null,
      });
    const trades = acc.trades || {};
    const ids = Object.keys(trades);
    for (let i = 0; i < ids.length; i += 400) {
      const chunk = ids.slice(i, i + 400);
      const batch = db.batch();
      chunk.forEach((id) => {
        batch.set(
          db.collection("mt5_accounts").doc(login).collection("trades").doc(id),
          trades[id],
        );
      });
      await batch.commit();
    }
    console.log(`Seeded account ${login} (${ids.length} trades)`);
  }
}

seed()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
