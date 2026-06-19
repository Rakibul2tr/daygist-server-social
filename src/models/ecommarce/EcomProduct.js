import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true }, // "Color", "Size"
    options: [{ type: String, trim: true }],
  },
  { _id: false },
);
const MediaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    provider: { type: String, default: "wasabi" },
    type: { type: String, default: "image" }, // optional
  },
  { _id: false },
);
const ShippingZoneSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true }, // "Dhaka", "Outside Dhaka"
    districts: [{ type: String, trim: true }], // optional list
    fee: { type: Number, default: 0 },
    etaMinDays: { type: Number, default: 2 },
    etaMaxDays: { type: Number, default: 5 },
  },
  { _id: false },
);

const ShippingSchema = new mongoose.Schema(
  {
    freeShipping: { type: Boolean, default: false },
    feeType: {
      type: String,
      enum: ["fixed", "by_zone", "by_weight", "by_cart"],
      default: "fixed",
    },
    fee: { type: Number, default: 0 }, // used when fixed
    zones: { type: [ShippingZoneSchema], default: [] }, // used when by_zone
    handlingTimeDays: { type: Number, default: 1 },
    codAvailable: { type: Boolean, default: true },
    returnable: { type: Boolean, default: false },
    warrantyText: { type: String, default: "" },
  },
  { _id: false },
);


const EcomProductSchema = new mongoose.Schema(
  {
    // Server will set these
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },

    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },

    description: { type: String, default: "" },
    shipping: { type: ShippingSchema, default: () => ({}) },
    // ✅ upload fee
    uploadFeePaid: { type: Boolean, default: false },
    uploadFeeCost: { type: Number, default: 0 },
    uploadFeePaidAt: { type: Date },

    // ✅ boost
    isBoosted: { type: Boolean, default: false },
    boostTier: {
      type: String,
      enum: ["basic", "regular", "pro"],
      default: null,
    },
    boostCost: { type: Number, default: 0 },
    boostDays: { type: Number, default: 0 },
    boostStartAt: { type: Date },
    boostEndAt: { type: Date },
    boostPaidAt: { type: Date },

    // Category
    // categoryId = LAST selected (child). categoryPath = [main, sub, child]
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EcomCategory",
      required: true,
    },
    categoryPath: [
      { type: mongoose.Schema.Types.ObjectId, ref: "EcomCategory" },
    ],

    brand: { type: String, default: "" },
    location: { type: String, default: "" },
    country: { type: String, default: "Bangladesh" },

    price: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    stock: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "active", "out_of_stock", "blocked", "pending"],
      default: "draft",
    },
    statusUpdatedAt: { type: Date },

    images: { type: [MediaSchema], default: [] },
    thumbnail: { type: MediaSchema, default: null },

    variants: { type: [VariantSchema], default: [] },

    // Social proof / seller dashboard numbers
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },

    // click/view count (seller dashboard)
    viewsCount: { type: Number, default: 0 },

    // Home sections (Phase-1 optional)
    isFeatured: { type: Boolean, default: false },
    isTopSelling: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Text search
EcomProductSchema.index({ title: "text", description: "text", brand: "text" });
EcomProductSchema.index({
  sellerId: 1,
  status: 1,
  isDeleted: 1,
  createdAt: -1,
});
EcomProductSchema.index({ categoryId: 1, status: 1, isDeleted: 1 });
EcomProductSchema.index({ categoryPath: 1, status: 1, isDeleted: 1 });
EcomProductSchema.index({ isFeatured: 1, status: 1, isDeleted: 1 });
EcomProductSchema.index({ isTopSelling: 1, status: 1, isDeleted: 1 });
EcomProductSchema.index({ isNewArrival: 1, status: 1, isDeleted: 1 });

const EcomProduct =
  mongoose.models.EcomProduct ||
  mongoose.model("EcomProduct", EcomProductSchema);

export default EcomProduct;
