export const isSellerOrShopModerator = (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const role = req.user.role;

  // ১. সেলার হলে সরাসরি পাস
  if (role === "SELLER") return next();

  // ২. মডারেটর হলে চেক করবে সে কোনো শপের আন্ডারে আছে কিনা এবং এক্টিভ কিনা
  if (
    role === "MODERATOR" &&
    req.user.sellerId &&
    req.user.moderatorStatus === "active"
  ) {
    return next();
  }

  return res
    .status(403)
    .json({ success: false, message: "Access denied: Shop staff only" });
};
