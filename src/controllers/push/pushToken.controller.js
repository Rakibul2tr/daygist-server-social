import PushToken from "../../models/push/pushToken.model.js";

export const registerPushToken = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const token = String(req.body?.token || "").trim();
    const platform = String(req.body?.platform || "android").toLowerCase();

    if (!token)
      return res.status(400).json({ ok: false, message: "Token required" });

    await PushToken.updateOne(
      { userId, token },
      { $set: { platform, disabled: false, lastSeenAt: new Date() } },
      { upsert: true },
    );

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

export const unregisterPushToken = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const token = String(req.body?.token || "").trim();
    if (!token)
      return res.status(400).json({ ok: false, message: "Token required" });

    await PushToken.updateOne({ userId, token }, { $set: { disabled: true } });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};
