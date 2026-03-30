// // FILE: src/utils/googleVerify.js
// import { OAuth2Client } from "google-auth-library";

// const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID1;
// const client = new OAuth2Client(clientId);

// export async function verifyGoogleToken(idToken) {
//   if (!idToken) throw new Error("idToken missing");
//   if (!clientId) throw new Error("GOOGLE_CLIENT_ID missing in .env");
//   console.log("idToken", idToken);

//   const ticket = await client.verifyIdToken({
//     idToken,
//     audience: clientId, // ✅ only tokens issued for your app
//   });
//   console.log('ticket',ticket);

//   const payload = ticket.getPayload();
//   if (!payload) throw new Error("Invalid Google token payload");

//   // payload fields (useful):
//   // payload.sub, payload.email, payload.name, payload.picture, payload.email_verified
//   return payload;
// }

import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

const googleAudiences = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_ID1,
  process.env.GOOGLE_CLIENT_ID2,
].filter(Boolean);

export async function verifyGoogleToken(idToken) {
  if (!idToken) throw new Error("idToken missing");
  if (!googleAudiences.length)
    throw new Error("No Google client IDs found in .env");

  const ticket = await client.verifyIdToken({
    idToken,
    audience: googleAudiences,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token payload");

  return payload;
}