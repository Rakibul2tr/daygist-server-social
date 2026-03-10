import mongoose, { Schema } from "mongoose";



const ReportSchema = new Schema(
  {
    targetType: {
      type: String,
      enum: ["post", "groupPost"],
      default: "post",
      index: true,
    },

    targetId: { type: Schema.Types.ObjectId, required: true, index: true }, // postId

    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      enum: [
        "spam",
        "scam",
        "nudity",
        "hate",
        "violence",
        "harassment",
        "copyright",
        "other",
      ],
      required: true,
      index: true,
    },

    details: { type: String, default: "" },

    // admin fields
    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, default: "" },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" }, // admin user id
    resolvedAt: { type: Date },

    // optional snapshot
    targetOwner: { type: Schema.Types.ObjectId, ref: "User", index: true }, // post owner id (quick filter)
  },
  { timestamps: true },
);

// ✅ prevent same user spamming same post রিপোর্ট multiple times
ReportSchema.index({ targetType: 1, targetId: 1, reporter: 1 }, { unique: true });

const Report = mongoose.model("Report", ReportSchema);
export default Report;
