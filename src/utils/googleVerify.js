// FILE: src/utils/googleVerify.js
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(clientId);

export async function verifyGoogleToken(idToken) {
  if (!idToken) throw new Error("idToken missing");
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID missing in .env");

  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId, // ✅ only tokens issued for your app
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token payload");

  // payload fields (useful):
  // payload.sub, payload.email, payload.name, payload.picture, payload.email_verified
  return payload;
}
