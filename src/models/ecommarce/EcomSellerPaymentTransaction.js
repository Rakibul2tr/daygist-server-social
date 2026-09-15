import mongoose from "mongoose";

const EcomSellerPaymentTransactionSchema = new mongoose.Schema(
  {
    // যাকে কেন্দ্র করে payment হয়েছে
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Payment কোন কাজের জন্য
    paymentType: {
      type: String,
      enum: ["boost", "seller_request", "order_accept"],
      required: true,
      index: true,
    },

    // Wallet থেকে কাটা payment amount
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ------------------------------------------------
    // BOOST
    // ------------------------------------------------

    boostTier: {
      type: String,
      enum: ["basic", "regular", "pro", null],
      default: null,
    },

    boostDays: {
      type: Number,
      default: 0,
    },

    // ------------------------------------------------
    // SELLER REQUEST
    // ------------------------------------------------

    businessType: {
      type: String,
      enum: ["individual", "business", null],
      default: null,
    },

    // ------------------------------------------------
    // ORDER ACCEPT
    // ------------------------------------------------

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EcomProduct",
      default: null,
      index: true,
    },

    // Order ID থাকলে পরে ব্যবহার করতে পারবে
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EcomOrder",
      default: null,
      index: true,
    },

    // ------------------------------------------------
    // PAYMENT STATUS
    // ------------------------------------------------

    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Admin daily earning query
EcomSellerPaymentTransactionSchema.index({
  status: 1,
  createdAt: -1,
});

// Seller payment history
EcomSellerPaymentTransactionSchema.index({
  sellerId: 1,
  createdAt: -1,
});

// Payment type অনুযায়ী earning
EcomSellerPaymentTransactionSchema.index({
  paymentType: 1,
  status: 1,
  createdAt: -1,
});

// Product order-accept payment
EcomSellerPaymentTransactionSchema.index({
  productId: 1,
  paymentType: 1,
  createdAt: -1,
});

const EcomSellerPaymentTransaction =
  mongoose.models.EcomSellerPaymentTransaction ||
  mongoose.model(
    "EcomSellerPaymentTransaction",
    EcomSellerPaymentTransactionSchema,
  );

export default EcomSellerPaymentTransaction;
