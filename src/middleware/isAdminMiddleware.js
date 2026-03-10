// middlewares/isAdmin.js
export const isAdmin = (req, res, next) => {
  // ধরে নিচ্ছি auth middleware req.user সেট করে
  if (!req.user)
    return res.status(401).json({ ok: false, message: "Unauthorized" });

  // user.role === "ADMIN" (তোমার schema অনুযায়ী)
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ ok: false, message: "Admin only" });
  }

  next();
};
