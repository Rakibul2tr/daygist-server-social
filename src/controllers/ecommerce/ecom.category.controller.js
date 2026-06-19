import EcomCategory from "../../models/ecommarce/EcomCategory.js";
import { slugify } from "../../utils/ecommerce/ecomHelpers.js";


const buildTree = (items) => {
  const map = new Map();
  const roots = [];

  items.forEach((c) => map.set(String(c._id), { ...c, children: [] }));

  items.forEach((c) => {
    const id = String(c._id);
    const node = map.get(id);
    if (!c.parentId) roots.push(node);
    else {
      const p = map.get(String(c.parentId));
      if (p) p.children.push(node);
      else roots.push(node);
    }
  });

  // sort children by sortOrder
  const sortNode = (n) => {
    n.children.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    n.children.forEach(sortNode);
  };
  roots.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  roots.forEach(sortNode);

  return roots;
};

export const getCategoryTree = async (req, res) => {
  try {
    const cats = await EcomCategory.find({ isActive: true })
      .select("_id name slug parentId level iconUrl sortOrder")
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    res.json({ success: true, data: buildTree(cats) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


// Admin create/update
export const createCategory = async (req, res) => {
  try {
    const { name, parentId = null, iconUrl = "", sortOrder = 0 } = req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    let level = 0;

    if (parentId) {
      const parent = await EcomCategory.findById(parentId).lean();
      if (!parent) {
        return res
          .status(400)
          .json({ success: false, message: "Parent not found" });
      }

      // ✅ prevent child-of-child (level 2 can't have children)
      if ((parent.level || 0) >= 2) {
        return res.status(400).json({
          success: false,
          message: "Child category cannot have children (max level 2)",
        });
      }

      level = (parent.level || 0) + 1; // 0->1, 1->2
    }

    const slug = slugify(name);

    const doc = await EcomCategory.create({
      name: name.trim(),
      slug,
      parentId,
      level,
      iconUrl,
      sortOrder,
    });

    res.json({ success: true, data: doc });
  } catch (e) {
    // ✅ duplicate slug message
    if (e?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category already exists (duplicate slug)",
      });
    }
    res.status(400).json({ success: false, message: e.message });
  }
};


export const updateCategory = async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.name) body.slug = slugify(body.name);

    // ✅ If parentId changes, recalc level
    if (body.parentId !== undefined) {
      if (!body.parentId) {
        body.parentId = null;
        body.level = 0;
      } else {
        const parent = await EcomCategory.findById(body.parentId).lean();
        if (!parent) {
          return res
            .status(400)
            .json({ success: false, message: "Parent not found" });
        }
        if ((parent.level || 0) >= 2) {
          return res.status(400).json({
            success: false,
            message: "Child category cannot have children (max level 2)",
          });
        }
        body.level = (parent.level || 0) + 1;
      }
    }

    const doc = await EcomCategory.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });

    res.json({ success: true, data: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category already exists (duplicate slug)",
      });
    }
    res.status(400).json({ success: false, message: e.message });
  }
};

