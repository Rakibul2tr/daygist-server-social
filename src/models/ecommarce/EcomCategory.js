import mongoose from "mongoose";


const EcomCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EcomCategory",
      default: null,
    },
    level: { type: Number, enum: [0, 1, 2], default: 0 }, // 0=Main,1=Sub,2=Child
    iconUrl: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

EcomCategorySchema.index({ parentId: 1, level: 1, isActive: 1, sortOrder: 1 });
EcomCategorySchema.index({ slug: 1 }, { unique: true });

// module.exports = mongoose.model("EcomCategory", EcomCategorySchema);
const EcomCategory =
  mongoose.models.EcomCategory ||
  mongoose.model("EcomCategory", EcomCategorySchema);
export default EcomCategory;