// controllers/sellerFee.controller.js (ESM)
import mongoose from "mongoose";
import EcomProduct from "../../models/ecommarce/EcomProduct.js";
import Wallet from "../../models/wallet/wallet.model.js";
import BoostPricing from "../../models/ecommarce/BoostPrising.model.js";


const PRODUCT_UPLOAD_FEE = 20; // ✅ তোমার চাইলে DB config বানিয়ে নিতে পারো

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + Number(days || 0));
  return x;
}

export const payProductFee = async (req, res) => {
  const sellerId = req.user?._id;
  const productId = req.params.id;

  const { feeType, tier, uploadFeeCost } = req.body || {};

  if (!sellerId)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!mongoose.Types.ObjectId.isValid(productId))
    return res
      .status(400)
      .json({ success: false, message: "Invalid product id" });

  if (!["upload", "boost"].includes(String(feeType)))
    return res
      .status(400)
      .json({ success: false, message: "feeType must be upload | boost" });

  const product = await EcomProduct.findOne({ _id: productId, sellerId });
  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });

  // ✅ FIX 1: declare cost
  let cost = 0;
  let productUpdate = {};

  if (feeType === "upload") {
    if (product.uploadFeePaid) {
      return res
        .status(400)
        .json({ success: false, message: "Upload fee already paid" });
    }

    // ✅ cost for upload (body থেকে আসবে)
    cost = Number(uploadFeeCost || 0);
    if (!cost || cost <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "upload FeeCost required" });
    }

    const nextStatus = product.status === "draft" ? "pending" : product.status;

    productUpdate = {
      uploadFeePaid: true,
      uploadFeeCost: cost,
      uploadFeePaidAt: new Date(),
      status: nextStatus,
      statusUpdatedAt: new Date(),
    };
  }

  if (feeType === "boost") {
    if (!tier || !["basic", "regular", "pro"].includes(String(tier))) {
      return res
        .status(400)
        .json({ success: false, message: "tier required: basic|regular|pro" });
    }

    const pricing = await BoostPricing.findOne({ tier, isActive: true }).lean();
    if (!pricing) {
      return res
        .status(400)
        .json({ success: false, message: "Boost tier not found/disabled" });
    }

    // ✅ cost from DB pricing
    cost = Number(pricing.price || 0);
    const days = Number(pricing.defaultDays || 0);

    const startAt = new Date();
    const endAt = addDays(startAt, days);

    productUpdate = {
      isBoosted: true,
      boostTier: tier,
      boostCost: cost,
      boostDays: days,
      boostStartAt: startAt,
      boostEndAt: endAt,
      boostPaidAt: new Date(),
    };
  }

  const session = await mongoose.startSession();

  try {
    let resultProduct;

    await session.withTransaction(async () => {
      // ✅ FIX 2: available balance check + deduct using cost
      const wallet = await Wallet.findOneAndUpdate(
        { userId: sellerId, available: { $gte: cost } }, // ✅ তোমার wallet field: available
        { $inc: { available: -cost } },
        { new: true, session },
      );

      if (!wallet) throw new Error("INSUFFICIENT_BALANCE");

      resultProduct = await EcomProduct.findOneAndUpdate(
        { _id: productId, sellerId },
        { $set: productUpdate },
        { new: true, session },
      );
    });

    return res.json({
      success: true,
      message: feeType === "upload" ? "Upload fee paid" : "Boost applied",
      data: {
        productId: resultProduct?._id,
        feeType,
        cost,
        boost:
          feeType === "boost"
            ? {
                tier: resultProduct.boostTier,
                days: resultProduct.boostDays,
                startAt: resultProduct.boostStartAt,
                endAt: resultProduct.boostEndAt,
              }
            : null,
        uploadFeePaid: resultProduct?.uploadFeePaid,
        status: resultProduct?.status,
      },
    });
  } catch (e) {
    const msg =
      e?.message === "INSUFFICIENT_BALANCE"
        ? "Insufficient wallet balance"
        : e?.message || "Payment failed";

    return res.status(400).json({ success: false, message: msg });
  } finally {
    session.endSession();
  }
};

