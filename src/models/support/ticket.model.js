import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "advertisement",
        "payment",
        "account_issue",
        "bug_report",
        "other",
      ],
    },
    userType: {
      type: String,
      enum: ["default", "monetization", "seller", "other"],
      required: true,
      default: "default",
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    // স্ক্রিনশট আপলোডের জন্য (ওয়াসাবি স্টোরেজ অবজেক্ট)
    attachments: [
      {
        url: { type: String },
        key: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    // অ্যাডমিন যখন এই টিকিটের রিপ্লাই দেবে, তখন মেসেজ এবং টাইম এখানে স্টোর হবে
    adminReply: {
      message: { type: String, default: null },
      repliedAt: { type: Date, default: null },
      repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true },
);

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
export default Ticket;
