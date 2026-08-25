import Cart from "../../models/ecommarce/Cart.model.js";
import EcomProduct from "../../models/ecommarce/EcomProduct.js";
import Order from "../../models/ecommarce/Order.model.js";
import { trackEcommerceInterest } from "../../services/ecommerce/ecommerceInterest.service.js";

// export const placeOrder = async (req, res) => {
//   const { addressText } = req.body;

//   const cart = await Cart.findOne({ userId: req.user._id });
//   if (!cart || cart.items.length === 0) {
//     return res.status(400).json({ message: "Cart is empty" });
//   }

//   let subtotal = 0;
//   const items = [];
//   const sellerMap = new Map();

//   for (const c of cart.items) {
//     const product = await EcomProduct.findById(c.productId);
//     if (!product) continue;

//     subtotal += product.finalPrice * c.qty;

//     items.push({
//       productId: product._id,
//       sellerId: product.sellerId,
//       title: product.title,
//       price: product.finalPrice,
//       qty: c.qty,
//     });

//     sellerMap.set(product.sellerId.toString(), {
//       sellerId: product.sellerId,
//       status: "placed",
//     });
//   }

//   const shippingFee = 60;
//   const total = subtotal + shippingFee;

//   const order = await Order.create({
//     userId: req.user._id,
//     items,
//     sellerStatuses: Array.from(sellerMap.values()),
//     subtotal,
//     shippingFee,
//     total,
//     addressText,
//   });

//   await EcomProduct.updateOne({ _id: productId }, { $inc: { soldCount: qty } });

//   await Cart.deleteOne({ userId: req.user._id });

//   res.json(order);
// };

export const placeOrder = async (req, res) => {
  try {
    const userId = req.user?._id;

    const { items, address, paymentMethod } = req.body;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: "No items" });
    }

    if (!address?.name || !address?.phone || !address?.address) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address" });
    }

    // 🔥 Recalculate from DB (never trust frontend)
    let subtotal = 0;

    const validatedItems = [];
    let product = null;

    for (const it of items) {
      product = await EcomProduct.findById(it.productId).lean();
      if (!product || product.status !== "active") continue;

      const price =
        product.finalPrice ??
        (product.discountPercent
          ? Math.round(
              product.price - (product.price * product.discountPercent) / 100,
            )
          : product.price);

      subtotal += price * it.qty;

      validatedItems.push({
        productId: product._id,
        qty: it.qty,
        price,
        variant: it.variant || "Default",
      });
    }

    const shippingFee = subtotal > 0 ? 60 : 0;
    const total = subtotal + shippingFee;

    const order = await Order.create({
      userId,
      items: validatedItems,
      sellerId: product.sellerId,
      subtotal,
      shippingFee,
      total,
      address,
      paymentMethod,
    });

    // Track product view
    if (userId) {
      trackEcommerceInterest({
        userId,
        product: product,
        action: "order",
      }).catch((err) => {
        console.error("Ecommerce interest tracking failed:", err);
      });
    }

    return res.json({
      success: true,
      data: order,
      message: "Order placed",
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "items.productId",
          select: "title thumbnail", // ✅ name + image + price
        })
        .lean(),
      Order.countDocuments(filter),
    ]);

    // ✅ items.product snapshot তৈরি করে পাঠানো
    const enriched = orders.map((o) => ({
      ...o,
      items: (o.items || []).map((it) => {
        const p = it.productId; // populated doc
        return {
          ...it,
          product: p
            ? {
                _id: p._id,
                title: p.title,
                thumbnail: p.thumbnail,
                finalPrice: p.finalPrice,
                price: p.price,
                discountPercent: p.discountPercent,
              }
            : null,
          productId: p?._id || it.productId,
        };
      }),
    }));

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      hasMore: skip + enriched.length < total,
      orders: enriched,
    });
  } catch (err) {
    console.error("getMyOrders error", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    console.error("getOrderDetails error", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};
