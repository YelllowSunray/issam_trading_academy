/**
 * Move root-level Firestore data into users/{TARGET_UID}/...
 *
 * Usage:
 *   TARGET_UID=xxxx node --env-file=.env.local scripts/migrate-legacy-to-user.mjs
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const uid = process.env.TARGET_UID;
if (!uid) {
  console.error("Set TARGET_UID to Issam's Firebase Auth uid");
  process.exit(1);
}

if (!getApps().length) {
  const { credential, projectId } = loadCredential();
  initializeApp({ credential, projectId });
}

const db = getFirestore();
const userRef = db.collection("users").doc(uid);

async function moveCollection(fromPath, toCol) {
  const snap = await db.collection(fromPath).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const chunk = snap.docs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((d) => {
      batch.set(toCol.doc(d.id), d.data());
      batch.delete(d.ref);
    });
    await batch.commit();
  }
  console.log(`Moved ${snap.size} docs from ${fromPath}`);
}

async function main() {
  const legacyAccounts = await db.collection("mt5_accounts").get();
  for (const accDoc of legacyAccounts.docs) {
    await userRef.collection("mt5_accounts").doc(accDoc.id).set(accDoc.data(), {
      merge: true,
    });
    const trades = await accDoc.ref.collection("trades").get();
    for (let i = 0; i < trades.docs.length; i += 400) {
      const chunk = trades.docs.slice(i, i + 400);
      const batch = db.batch();
      chunk.forEach((t) => {
        batch.set(
          userRef
            .collection("mt5_accounts")
            .doc(accDoc.id)
            .collection("trades")
            .doc(t.id),
          t.data(),
        );
        batch.delete(t.ref);
      });
      await batch.commit();
    }
    await accDoc.ref.delete();
    console.log(`Moved mt5 account ${accDoc.id} (${trades.size} trades)`);
  }

  await moveCollection("manual_trades", userRef.collection("manual_trades"));
  await moveCollection("annotations", userRef.collection("annotations"));

  const settings = await db.collection("settings").doc("app").get();
  if (settings.exists) {
    await userRef.collection("settings").doc("app").set(settings.data() || {}, {
      merge: true,
    });
    await settings.ref.delete();
    console.log("Moved settings/app");
  }

  console.log("Migration complete for", uid);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
