import mongoose from "mongoose";

const MediaSchema = {
  key: { type: String, required: true },
  url: { type: String, required: true },
  provider: { type: String, default: "wasabi" },
};

const SellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    // request info
    shopName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: "", trim: true },

    nidNumber: { type: String, default: "", trim: true },
    nidFrontImage: { type: MediaSchema, default: null },
    nidBackImage: { type: MediaSchema, default: null },
    tradeLicense: { type: String, default: "", trim: true }, // optional
    businessType: { type: String, default: "individual", trim: true }, // optional

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reason: { type: String, default: "", trim: true }, // rejection reason

    // shop visuals (later)
    logo: { type: MediaSchema, default: null },
    banner: { type: MediaSchema, default: null },
    description: { type: String, default: "" },

    // admin
    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

SellerSchema.index({ userId: 1, isDeleted: 1 });
SellerSchema.index({ status: 1, isDeleted: 1, createdAt: -1 });

const Seller = mongoose.models.Seller || mongoose.model("Seller", SellerSchema);
export default Seller;
