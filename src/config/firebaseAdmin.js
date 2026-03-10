import admin from "firebase-admin";
import fs from "fs";

function loadServiceAccount() {
  // A) ENV JSON string
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    const sa = JSON.parse(raw);

    // ✅ .env এ \\n থাকে, PEM এর জন্য \n করতে হবে
    if (sa.private_key && typeof sa.private_key === "string") {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }
    return sa;
  }

  // B) ENV file path (recommended for dev)
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (p && fs.existsSync(p)) {
    const sa = JSON.parse(fs.readFileSync(p, "utf8"));
    return sa;
  }

  return null;
}

export function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const sa = loadServiceAccount();

  if (sa) {
    admin.initializeApp({
      credential: admin.credential.cert(sa),
    });
    return admin;
  }

  // fallback (works only if proper ADC set)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  return admin;
}

export const firebaseAdmin = initFirebaseAdmin();
