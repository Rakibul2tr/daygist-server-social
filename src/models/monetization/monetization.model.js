// models/MonetizationApplication.js
import mongoose from "mongoose";

const MonetizationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fullAddress: { 
      area:{type:String,default:null},
      city:{type:String,default:null},
      district:{type:String,default:null},
      postCode:{type:String,default:null},
     },

    nidFront: {
      url: { type: String, required: true },
      key: { type: String, required: true },
      provider: { type: String, default: "wasabi" },
    },
    nidBack: {
      url: { type: String, required: true },
      key: { type: String, required: true },
      provider: { type: String, default: "wasabi" },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    rejectReason: { type: String, default: null },
  },
  { timestamps: true }
);

// ✅ prevent multiple pending per user
MonetizationSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

const Monetization =
  mongoose.models.Monetization ||
  mongoose.model("Monetization", MonetizationSchema);
export default Monetization;
