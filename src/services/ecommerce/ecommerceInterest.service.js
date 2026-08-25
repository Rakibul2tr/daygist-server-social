import EcommerceInterest from "../../models/ecommarce/ecommerceInterest.model.js";

/**
 * Track user's ecommerce interest
 *
 * Rules:
 * - One user + one product = one interest document
 * - Existing product -> update action/time
 * - New product -> create new document
 * - Maximum 5 interests per user
 * - 6th interest হলে oldest permanently delete
 */
export const trackEcommerceInterest = async ({ userId, product, action }) => {
  try {
    if (!userId || !product?._id || !product?.categoryId || !action) {
      return null;
    }

    // 1. Existing product interest আছে কিনা
    const existingInterest = await EcommerceInterest.findOne({
      userId,
      productId: product._id,
    });

    if (existingInterest) {
      // একই product আবার interaction করলে
      // পুরোনো record update করে latest বানানো হবে
      existingInterest.action = action;
      existingInterest.categoryId = product.categoryId;
      existingInterest.categoryPath = product.categoryPath || [];
      existingInterest.lastInteractionAt = new Date();

      await existingInterest.save();

      return existingInterest;
    }

    // 2. নতুন product interest create
    const interest = await EcommerceInterest.create({
      userId,
      productId: product._id,
      categoryId: product.categoryId,
      categoryPath: product.categoryPath || [],
      action,
      lastInteractionAt: new Date(),
    });

    // 3. User-এর interest count check
    const interests = await EcommerceInterest.find({ userId })
      .sort({ lastInteractionAt: -1 })
      .select("_id")
      .lean();

    // 4. 5টার বেশি হলে oldest record delete
    if (interests.length > 5) {
      const oldInterestIds = interests.slice(5).map((item) => item._id);

      await EcommerceInterest.deleteMany({
        userId,
        _id: { $in: oldInterestIds },
      });
    }

    return interest;
  } catch (error) {
    console.error("❌ Ecommerce interest tracking error:", error);
    return null;
  }
};
