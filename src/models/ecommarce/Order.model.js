// import mongoose from "mongoose";

// const orderItemSchema = new mongoose.Schema({
//   productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
//   sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   title: String,
//   price: Number,
//   qty: Number,
// });

// const sellerStatusSchema = new mongoose.Schema({
//   sellerId: mongoose.Schema.Types.ObjectId,
//   status: {
//     type: String,
//     enum: ["placed", "packed", "shipped", "delivered"],
//     default: "placed",
//   },
// });

// const orderSchema = new mongoose.Schema(
//   {
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

//     items: [orderItemSchema],
//     sellerStatuses: [sellerStatusSchema],

//     subtotal: Number,
//     shippingFee: Number,
//     total: Number,

//     paymentMethod: { type: String, enum: ["COD"], default: "COD" },
//     addressText: String,

//     status: {
//       type: String,
//       enum: ["placed", "completed", "cancelled", "delivered"],
//       default: "placed",
//     },
//   },
//   { timestamps: true },
// );

// const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
// export default Order;

import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "EcomProduct" },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    variant: { type: String },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    items: [OrderItemSchema],

    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    total: { type: Number, required: true },

    address: {
      name: String,
      phone: String,
      address: String,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash one delivery", "BKASH"],
      default: "Cash one delivery",
    },

    status: {
      type: String,
      enum: ["placed", "processing", "shipped", "delivered", "canceled"],
      default: "placed",
    },
  },
  { timestamps: true },
);

 const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export default Order;