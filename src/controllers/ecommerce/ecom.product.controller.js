import mongoose from "mongoose";
import EcomProduct from "../../models/ecommarce/EcomProduct.js";
import { clampInt, slugify } from "../../utils/ecommerce/ecomHelpers.js";

const basePublicFilter = {
  isDeleted: false,
  status: "active",
};
const pickCountry = (req) => {
  const c = String(req.query.country || "").trim();
  return c || "Bangladesh";
};

export const getProductDetails = async (req, res) => {
  try {
    const p = await EcomProduct.findOne({
      _id: req.params.id,
      ...basePublicFilter,
    }).lean();
    if (!p)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.json({ success: true, data: p });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ✅ POST /e-commerce/products/by-ids
// body: { ids: ["id1","id2", ...] }
export const listProductsByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "ids array is required" });
    }

    // ✅ validate + clean
    const cleanIds = Array.from(
      new Set(
        ids
          .map((x) => String(x || "").trim())
          .filter((x) => mongoose.Types.ObjectId.isValid(x)),
      ),
    );

    if (cleanIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid ids provided" });
    }

    // ✅ keep same public filter style (adjust if you have basePublicFilter)
    const filter = {
      _id: { $in: cleanIds },
      isDeleted: false,
      // status: "active", // চাইলে enable করো (cart এ inactive product hide হবে)
    };

    const items = await EcomProduct.find(filter).lean();

    // ✅ preserve requested order (ids order)
    const map = new Map(items.map((p) => [String(p._id), p]));
    const ordered = cleanIds.map((id) => map.get(id)).filter(Boolean);

    return res.json({
      success: true,
      data: ordered,
      count: ordered.length,
    });
  } catch (e) {
    console.error("listProductsByIds error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/ecom/products
// q, categoryId, minPrice, maxPrice, minRating, brand, sellerId, sort, page, limit
export const listProducts = async (req, res) => {
  try {
    const {
      q,
      categoryId,
      minPrice,
      maxPrice,
      minRating,
      sellerId,
      sort = "relevance",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      status: "active",
    };

    // 🔍 Search (title + description)
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    // 📂 Category filter (tree support)
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categoryPath = mongoose.Types.ObjectId(categoryId);
    }

    // 💰 Price range
    if (minPrice || maxPrice) {
      filter.finalPrice = {};
      if (minPrice) filter.finalPrice.$gte = Number(minPrice);
      if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
    }

    // ⭐ Rating
    if (minRating) {
      filter.ratingAvg = { $gte: Number(minRating) };
    }

    // 🏪 Seller
    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      filter.sellerId = sellerId;
    }

    // 🔃 Sort
    let sortQuery = {};
    switch (sort) {
      case "newest":
        sortQuery = { createdAt: -1 };
        break;
      case "price_low":
        sortQuery = { finalPrice: 1 };
        break;
      case "price_high":
        sortQuery = { finalPrice: -1 };
        break;
      case "top_rated":
        sortQuery = { ratingAvg: -1 };
        break;
      default:
        // relevance / default
        sortQuery = { soldCount: -1, ratingAvg: -1 };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      EcomProduct.find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      EcomProduct.countDocuments(filter),
    ]);
    // console.log("items", items.length, "total", total);

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      hasMore: skip + items.length < total,
      items,
    });
  } catch (err) {
    console.error("listProducts error", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// ✅ GET /e-commerce/products/:id/related?limit=10. related product==========
export const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = clampInt(req.query.limit, 10, 1, 30);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }

    // 1) current product
    const current = await EcomProduct.findOne({ _id: id, isDeleted: false })
      .select("_id categoryId")
      .lean();

    if (!current) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // 2) related by categoryId, exclude current
    const related = await EcomProduct.find({
      isDeleted: false,
      status: "active", // ✅ only active
      categoryId: current.categoryId,
      _id: { $ne: current._id },
    })
      .sort({
        isBoosted: -1,
        isFeatured: -1,
        soldCount: -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: related,
      meta: { limit, count: related.length },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Sections (Home)
/* =========================================================
   ✅ Home Section: FEATURED (admin sets isFeatured=true)
   GET /e-commerce/products/featured?limit=12&country=Bangladesh
========================================================= */
export const featured = async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 12, 1, 30);
    const country = pickCountry(req); // ✅ default Bangladesh

    const items = await EcomProduct.find({
      ...basePublicFilter,
      // isFeatured: true,
      country, // ✅ filter by country
      isBoosted: true,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, data: items });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* =========================================================
   ✅ Home Section: TOP SELLING (soldCount based)
   GET /e-commerce/products/top-selling?limit=12&country=Bangladesh
========================================================= */
export const topSelling = async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 12, 1, 30);
    const country = pickCountry(req); // ✅ default Bangladesh

    const items = await EcomProduct.find({
      ...basePublicFilter,
      country, // ✅ filter by country
    })
      .sort({
        soldCount: -1,
        ratingAvg: -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    return res.json({ success: true, data: items });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* =========================================================
   ✅ Home Section: NEW ARRIVALS (createdAt last X days)
   GET /e-commerce/products/new-arrivals?limit=12&days=30&country=Bangladesh
========================================================= */
export const newArrivals = async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 12, 1, 30);
    const days = clampInt(req.query.days, 30, 1, 180);
    const country = pickCountry(req); // ✅ default Bangladesh

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const items = await EcomProduct.find({
      ...basePublicFilter,
      country, // ✅ filter by country
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, data: items });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// seller create/update product (later seller route will be separate)

const isObjId = (v) => mongoose.Types.ObjectId.isValid(String(v));

export const sellerCreateProduct = async (req, res) => {
  try {
    const sellerId = req.user?._id; // authGuard gives this
    if (!sellerId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const {
      title,
      description = "",
      price,
      discountPercent = 0,
      stock = 0,
      categoryPath = [],
      categoryId, // optional, but we will compute if not passed

      images = [],
      thumbnail,
      status = "draft",

      brand = "",
      location = "",
      country,
      variants = [],
      shopId, // optional: if you already have shop table and want to set it
      shipping,
    } = req.body;

    // REQUIRED checks
    if (!title?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }
    if (price == null || Number(price) <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid price required" });
    }
    if (!Array.isArray(categoryPath) || categoryPath.length < 2) {
      // minimum main + child
      return res.status(400).json({
        success: false,
        message: "categoryPath required (min: [mainId, childId])",
      });
    }

    // Validate categoryPath IDs
    for (const id of categoryPath) {
      if (!isObjId(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid categoryPath id" });
      }
    }

    // Decide categoryId (last node)
    const finalCategoryId =
      categoryId && isObjId(categoryId)
        ? categoryId
        : categoryPath[categoryPath.length - 1];

    // Images validation
    const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
    if (imgs.length < 1) {
      return res
        .status(400)
        .json({ success: false, message: "At least 1 image required" });
    }
    if (imgs.length > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Maximum 5 images allowed" });
    }

    // compute finalPrice
    const p = Number(price);
    const dp = Math.max(0, Math.min(Number(discountPercent || 0), 100));
    const finalPrice = Math.round(p - (p * dp) / 100);

    // stock based status (auto)
    let finalStatus = status;
    if (Number(stock) <= 0 && status === "active") {
      finalStatus = "out_of_stock";
    }

    // variants normalize
    const cleanVariants = Array.isArray(variants)
      ? variants
          .filter(
            (v) => v?.name && Array.isArray(v?.options) && v.options.length > 0,
          )
          .map((v) => ({
            name: String(v.name).trim(),
            options: v.options.map((o) => String(o).trim()).filter(Boolean),
          }))
      : [];

    // shopId optional (if you keep shop per seller)
    const finalShopId = shopId && isObjId(shopId) ? shopId : null;

    const doc = await EcomProduct.create({
      sellerId,
      shopId: finalShopId,

      title: title.trim(),
      slug: slugify(title),

      description,

      categoryId: finalCategoryId,
      categoryPath,

      brand,
      location,
      country,

      price: p,
      discountPercent: dp,
      finalPrice,

      stock: Number(stock),

      status: finalStatus,

      images: imgs,
      thumbnail: thumbnail || imgs[0],

      variants: cleanVariants,
      shipping: {
        freeShipping: shipping?.freeShipping,
        feeType: shipping?.feeType,
        fee: shipping?.fee,
        zones: shipping?.zones,
        handlingTimeDays: shipping?.handlingTimeDays,
        codAvailable: shipping?.codAvailable,
        returnable: shipping?.returnable,
        warrantyText: shipping?.warrantyText,
      },

      // defaults:
      ratingAvg: 0,
      ratingCount: 0,
      soldCount: 0,
      viewsCount: 0,

      // for home sections (admin later)
      isFeatured: false,
      isTopSelling: false,
      isNewArrival: false,

      isDeleted: false,
    });

    // response for RN (minimal but enough)
    return res.json({
      success: true,
      data: {
        _id: doc._id,
        title: doc.title,
        thumbnail: doc.thumbnail,
        price: doc.price,
        discountPercent: doc.discountPercent,
        finalPrice: doc.finalPrice,
        stock: doc.stock,
        status: doc.status,
        categoryId: doc.categoryId,
        categoryPath: doc.categoryPath,
        createdAt: doc.createdAt,
      },
      message: "Product created",
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const sellerGetMyProducts = async (req, res) => {
  try {
    const sellerId = req.user?._id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { sellerId, isDeleted: false };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      EcomProduct.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-__v -isDeleted") // ✅ exclude only
        .lean(),
      EcomProduct.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const sellerUpdateProduct = async (req, res) => {
  console.log("req", req.params.id);
  console.log("req body", req.body);

  try {
    const incoming = req.body?.body ?? req.body; // ✅ unwrap
    const body = { ...incoming };

    if (body.title) body.slug = slugify(body.title);

    if (body.price != null || body.discountPercent != null) {
      const current = await EcomProduct.findById(req.params.id).lean();
      const price =
        body.price != null ? Number(body.price) : Number(current.price);
      const dp =
        body.discountPercent != null
          ? Number(body.discountPercent)
          : Number(current.discountPercent || 0);
      const clamped = Math.max(0, Math.min(dp, 100));
      body.finalPrice = Math.round(price - (price * clamped) / 100);
    }

    const doc = await EcomProduct.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    const verify = await EcomProduct.findById(req.params.id).lean();

    console.log("after update country:", doc?.country);
    console.log("verify country from DB:", verify?.country);
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const sellerSoftDeleteProduct = async (req, res) => {
  try {
    await EcomProduct.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true },
    );
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// for admin

export const adminSetFeatured = async (req, res) => {
  try {
    const { isFeatured = true } = req.body;

    const doc = await EcomProduct.findByIdAndUpdate(
      req.params.id,
      { $set: { isFeatured: !!isFeatured } },
      { new: true },
    ).lean();

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, data: doc, message: "Featured updated" });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const adminListPendingProducts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: false,
      status: "pending",
    };

    const [data, total] = await Promise.all([
      EcomProduct.find(filter)
        .sort({ statusUpdatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EcomProduct.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + data.length < total,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const ALLOWED_STATUS = new Set([
  "draft",
  "pending",
  "active",
  "canceled",
  "out_of_stock",
  "blocked",
]);
export const adminUpdateProductStatus = async (req, res) => {
  try {
    const productId = req.params.id;
    const { status, adminNote } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }

    if (!status || !ALLOWED_STATUS.has(String(status))) {
      return res.status(400).json({
        success: false,
        message: "status must be: draft | pending | active | canceled",
      });
    }

    const update = {
      status: String(status),
      statusUpdatedAt: new Date(),
    };

    // optional note
    if (typeof adminNote === "string") {
      update.adminNote = adminNote.trim();
    }

    const doc = await EcomProduct.findOneAndUpdate(
      { _id: productId, isDeleted: false },
      { $set: update },
      { new: true },
    ).lean();

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      data: doc,
      message: "Status updated",
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const adminListAllProducts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
    const skip = (page - 1) * limit;

    const {
      q,
      status, // draft | pending | active | canceled
      sellerId,
      categoryId,
      isDeleted, // true/false (optional)
      sort, // newest | oldest | price_low | price_high | sold_high | views_high
    } = req.query;

    const filter = {};

    // ✅ isDeleted default false (admin চাইলে override করতে পারবে)
    if (typeof isDeleted === "string") {
      filter.isDeleted = isDeleted === "true";
    } else {
      filter.isDeleted = false;
    }

    // ✅ status filter
    if (status) filter.status = String(status);

    // ✅ seller filter
    if (sellerId) filter.sellerId = sellerId;

    // ✅ category filter
    if (categoryId) filter.categoryId = categoryId;

    // ✅ search
    if (q && String(q).trim()) {
      const kw = String(q).trim();
      filter.$or = [
        { title: { $regex: kw, $options: "i" } },
        { slug: { $regex: kw, $options: "i" } },
        { brand: { $regex: kw, $options: "i" } },
      ];
    }

    // ✅ sort mapping
    let sortObj = { createdAt: -1 };
    if (sort === "oldest") sortObj = { createdAt: 1 };
    if (sort === "price_low") sortObj = { finalPrice: 1, price: 1 };
    if (sort === "price_high") sortObj = { finalPrice: -1, price: -1 };
    if (sort === "sold_high") sortObj = { soldCount: -1, createdAt: -1 };
    if (sort === "views_high") sortObj = { viewsCount: -1, createdAt: -1 };

    const [data, total] = await Promise.all([
      EcomProduct.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      EcomProduct.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + data.length < total,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const adminGetSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // 🛡️ ১. আইডিটি ভ্যালিড মঙ্গোডিবি অবজেক্ট আইডি কিনা চেক (Safety Guard)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID format",
      });
    }

    // 🚀 ২. প্রোডাক্ট খুঁজে বের করা এবং প্রয়োজনীয় তথ্য পপুলেট করা
    const product = await EcomProduct.findById(id)
      .populate({
        path: "shopId",
        select: "shopName phone status",
        model: "Seller", // 🛠️ আপনার মডেলের নাম 'Seller' এখানে সিঙ্ক করা হলো
      })
      .populate("categoryId", "name slug level") // ক্যাটাগরির নাম ও লেভেল নিয়ে আসবে
      .lean();

    // ৩. প্রোডাক্ট না পাওয়া গেলে ৪MD এরর
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or has been removed",
      });
    }

    // ৪. সফল রেসপন্স (আপনার ফ্রন্টএন্ড res.data.data ফরম্যাটের সাথে মিল রেখে)
    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (e) {
    console.error("Admin Single Product Fetch Error:", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Internal server error",
    });
  }
};