import Seller from "../models/ecommarce/Seller.model.js";

export const isSellerApproved = async (req, res, next) => {
  const userId = req.user?._id;

  const seller = await Seller.findOne({
    userId,
    status: "approved",
    isDeleted: false,
  }).lean();

  if (!seller) {
    return res.status(403).json({
      success: false,
      message: "Seller approval required",
    });
  }

  req.seller = seller; // later shopId use করতে পারবে
  next();
};
