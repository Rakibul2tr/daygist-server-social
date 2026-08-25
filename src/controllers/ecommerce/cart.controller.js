import Cart from "../../models/ecommarce/Cart.model.js";
import EcomProduct from "../../models/ecommarce/EcomProduct.js";
import Seller from "../../models/ecommarce/Seller.model.js";
import User from "../../models/user/user.model.js";
import { trackEcommerceInterest } from "../../services/ecommerce/ecommerceInterest.service.js";

export const getCart = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        model: EcomProduct,
        select:
          "title price discountPercent finalPrice thumbnail stock status sellerId shopId shipping",
        populate: [
          // ✅ seller user (name, phone, avatar etc.)
          {
            path: "sellerId",
            model: User,
            select: "name phone avatar",
          },
          // ✅ shop/seller profile (shopName, rating etc.)
          {
            path: "shopId",
            model: Seller,
            select: "shopName logo ratingAvg ratingCount phone",
          },
        ],
      })
      .lean();

    if (!cart) {
      return res.json({
        success: true,
        data: [],
        message: "Cart empty",
      });
    }

    // 🔥 clean + safe response
    //  console.log("item", cart.items);

    const items = (cart.items || [])
      .filter((it) => it.productId) // deleted product remove
      .map((it) => {
        const p = it.productId;
        const base = Number(p.price || 0);
        const discount = Number(p.discountPercent || 0);
        // console.log('p',p);
        

        const finalPrice =
          p.finalPrice != null
            ? Number(p.finalPrice)
            : discount
              ? Math.round(base - (base * discount) / 100)
              : base;

        return {
          productId: String(p._id),
          qty: Number(it.qty || 0),
          variant: it.variant || "Default",

          // ✅ product info
          product: {
            _id: String(p._id),
            title: p.title,
            thumbnail: p.thumbnail,
            price: base,
            discountPercent: discount,
            finalPrice,
            stock: p.stock,
            status: p.status,
            shipping:p.shipping
          },

          // ✅ seller info (user + shop)
          seller: {
            sellerId: p?.sellerId?._id
              ? String(p.sellerId._id)
              : String(p.sellerId || ""),
            name: p?.sellerId?.name || p?.shopId?.shopName || "Seller",
            phone: p?.sellerId?.phone ||p?.shopId?.phone|| "",
            avatar: p?.sellerId?.avatar || p?.shopId?.logo||null,

            shopId: p?.shopId?._id
              ? String(p.shopId._id)
              : String(p.shopId || ""),
            shopName: p?.shopId?.shopName || "",
            shopLogo: p?.shopId?.logo || null,
            ratingAvg: Number(p?.shopId?.ratingAvg || 0),
            ratingCount: Number(p?.shopId?.ratingCount || 0),
          },
        };
      });

    return res.json({
      success: true,
      data: items,
      message: "Cart fetched",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

export const addToCart = async (req, res) => {
  const { productId, qty } = req.body;
  const userId = req.user?._id;

  const product = await EcomProduct.findById(productId);
  if (!product || product.status !== "active") {
    return res.status(400).json({ message: "Invalid product" });
  }

  let cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) cart = await Cart.create({ userId: req.user._id, items: [] });

  const existing = cart.items.find((i) => i.productId.toString() === productId);

  if (existing) {
    existing.qty=qty;
  } else {
    cart.items.push({
      productId,
      sellerId: product.sellerId,
      qty,
    });
  }

    // Track product view
      if (userId) {
        trackEcommerceInterest({
          userId,
          product: product,
          action: "add_to_cart",
        }).catch((err) => {
          console.error("Ecommerce interest tracking failed:", err);
        });
      }

  await cart.save();
  res.json(cart);
};

export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ auth middleware থেকে
    const productId = String(req.params.productId || "");
    const variant = String(req.query.variant || "Default");

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "productId required" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({
        success: true,
        data: { items: [] },
        message: "Cart empty",
      });
    }

    const before = cart.items.length;

    cart.items = cart.items.filter((it) => {
      const v = it.variant || "Default";
      return !(String(it.productId) === productId && v === variant);
    });

    if (cart.items.length === before) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    await cart.save();

    return res.json({
      success: true,
      message: "Removed from cart",
      data: cart,
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const cartItemAction = async (req, res) => {
  try {
    const userId = req.user._id; // auth middleware must set req.user
    const incoming = req.body?.body ?? req.body; // ✅ unwrap support

    const productId = String(incoming.productId || "");
    const variant = String(incoming.variant || "Default");
    const type = String(incoming.type || "").toLowerCase(); // inc | dec | set | remove
    const qty = incoming.qty;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "productId required" });
    }

    if (!["inc", "dec", "set", "remove"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type must be one of: "inc", "dec", "set", "remove"',
      });
    }

    // find/create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });

    const idx = cart.items.findIndex((it) => {
      const v = it.variant || "Default";
      return String(it.productId) === productId && v === variant;
    });

    // helper: remove item
    const removeNow = async () => {
      if (idx >= 0) cart.items.splice(idx, 1);
      await cart.save();
      return res.json({ success: true, message: "Removed", data: cart });
    };

    // ✅ REMOVE
    if (type === "remove") {
      return await removeNow();
    }

    // ✅ SET
    if (type === "set") {
      const nextQty = Number(qty);

      if (Number.isNaN(nextQty) || nextQty < 0) {
        return res
          .status(400)
          .json({ success: false, message: "qty must be >= 0" });
      }

      if (nextQty === 0) return await removeNow();

      if (idx >= 0) {
        cart.items[idx].qty = nextQty;
      } else {
        cart.items.push({ productId, variant, qty: nextQty });
      }

      await cart.save();
      return res.json({ success: true, message: "Updated", data: cart });
    }

    // ✅ INC / DEC (delta)
    const delta = type === "inc" ? 1 : -1;

    if (idx < 0) {
      // inc হলে create, dec হলে not found
      if (delta === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found" });
      }
      cart.items.push({ productId, variant, qty: 1 });
      await cart.save();
      return res.json({ success: true, message: "Updated", data: cart });
    }

    const currentQty = Number(cart.items[idx].qty || 0);
    const nextQty = currentQty + delta;

    if (nextQty <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].qty = nextQty;
    }

    await cart.save();
    return res.json({ success: true, message: "Updated", data: cart });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};