import mongoose from "mongoose";

const EcommerceInterestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EcomProduct",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EcomCategory",
      required: true,
    },

    categoryPath: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EcomCategory",
      },
    ],

    action: {
      type: String,
      enum: ["search", "view", "click", "add_to_cart", "order"],
      required: true,
    },

    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// প্রতিটি user-এর একই product-এর জন্য একটি মাত্র interest record
EcommerceInterestSchema.index({ userId: 1, productId: 1 }, { unique: true });

// latest interest দ্রুত পাওয়ার জন্য
EcommerceInterestSchema.index({
  userId: 1,
  lastInteractionAt: -1,
});

const EcommerceInterest =
  mongoose.models.EcommerceInterest ||
  mongoose.model("EcommerceInterest", EcommerceInterestSchema);

export default EcommerceInterest;
