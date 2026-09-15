// FILE: src/middleware/authMiddleware.js
import User from "../models/user/user.model.js";
import { verifyToken } from "../utils/jwt.js";

export const authGuard = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.accountStatus === "deleted") {
      return res.status(403).json({ message: "Account deleted" });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({ message: "Account suspended" });
    }

    req.user = user;

    next();
    // console.log("✅ [Auth Success]: User authenticated", user._id);
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
