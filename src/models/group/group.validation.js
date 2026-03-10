
export const normalizeRules = (rules) => {
  if (!Array.isArray(rules)) return [];
  return rules
    .map((r) => ({
      title: String(r?.title || "").trim(),
      text: String(r?.text || "").trim(),
    }))
    .filter((r) => r.title || r.text)
    .slice(0, 20);
};

export const validateCreateGroupBody = (body) => {
  const name = String(body?.name || "").trim();
  const privacy = String(body?.privacy || "").trim();

  if (!name) return { ok: false, message: "Group name is required" };
  if (!["public", "private"].includes(privacy))
    return { ok: false, message: "Privacy must be public or private" };

  return { ok: true };
};

export const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
