import PushToken from "../../models/push/pushToken.model.js";
import { firebaseAdmin } from "../../config/firebaseAdmin.js";

export async function sendPushToUser(toUserId, payload) {
  if (!toUserId) return { ok: false, reason: "missing_toUserId" };

  const rows = await PushToken.find({
    userId: toUserId,
    disabled: false,
  })
    .select("token")
    .lean();

  const tokens = rows.map((r) => r.token).filter(Boolean);
  if (!tokens.length) return { ok: false, reason: "no_tokens" };

  // FCM data must be string
  const safeData = {};
  if (payload?.data && typeof payload.data === "object") {
    for (const [k, v] of Object.entries(payload.data)) {
      safeData[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
  }

  const message = {
    notification: {
      title: payload?.title || "DayGist",
      body: payload?.body || "",
    },
    data: safeData,
    android: { priority: "high" },
    tokens,
  };

  const resp = await firebaseAdmin.messaging().sendEachForMulticast(message);

  // invalid tokens cleanup
  const invalidTokens = [];
  resp.responses.forEach((r, idx) => {
    if (!r.success) {
      const code = r.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument")
      ) {
        invalidTokens.push(tokens[idx]);
      }
    }
  });

  if (invalidTokens.length) {
    await PushToken.updateMany(
      { userId: toUserId, token: { $in: invalidTokens } },
      { $set: { disabled: true } },
    );
  }

  return { ok: true, sent: resp.successCount, failed: resp.failureCount };
}
