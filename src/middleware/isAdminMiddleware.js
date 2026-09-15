// middlewares/isAdmin.js

export const isAdmin = (req, res, next) => {
  // ধরে নিচ্ছি auth middleware req.user সেট করে
  if (!req.user)
    return res.status(401).json({ ok: false, message: "Unauthorized" });

  // user.role === "ADMIN" (তোমার schema অনুযায়ী)
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ ok: false, message: "Admin only" });
  }

  next();
};

// middlewares/isModerator.js

export const isModerator = (req, res, next) => {
  // ১. ইউজার লগইন করা আছে কিনা চেক (ধরে নিচ্ছি authMiddleware এটি সেট করেছে)
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  // ২. অ্যাডমিন বা সুপার অ্যাডমিন হলে কোনো চেক ছাড়াই সব রাউটে পাস পাবে
  if (req.user.role === "ADMIN" || req.user.role === "SUPPER ADMIN") {
    return next();
  }

  // ৩. মডারেটর হলে পারমিশন চেক হবে
  if (req.user.role === "MODERATOR") {
    // অ্যাকাউন্ট অ্যাক্টিভ কিনা চেক
    if (req.user.moderatorStatus === "inactive") {
      return res.status(403).json({ ok: false, message: "মডারেটর অ্যাকাউন্টটি ইনঅ্যাক্টিভ আছে।" });
    }

    // // কারেন্ট রাউটের পাথ বের করা (যেমন: "/all-orders")
    // const currentRoute = req.path; 

    // // ইউজারের ডাটাবেজ অ্যারেতে এই রাউটের নাম হুবহু আছে কিনা চেক
    // const hasPermission = req.user.permissions.includes(currentRoute);

    // if (!hasPermission) {
    //   return res.status(403).json({ 
    //     ok: false, 
    //     message: `আপনার এই ফিচারে (${currentRoute}) অ্যাক্সেস করার পারমিশন নেই।` 
    //   });
    // }

    return next(); // পারমিশন থাকলে রিকোয়েস্ট পাস হবে
  }

  // ৪. অন্য কোনো রোল হলে রিজেক্ট
  return res.status(403).json({ ok: false, message: "Access denied" });
};


export const isAdminOrModerator = (req, res, next) => {
  console.log("🔍 [isAdminOrModerator Middleware]: ইউজারের রোল চেক করা হচ্ছে...");
  // ১. ইউজার অবজেক্ট আছে কিনা চেক
  if (!req.user) {
    console.log(
      "❌ [Auth Error]: req.user পাওয়া যায়নি। authGuard হয়তো ইউজার সেট করেনি।",
    );
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  console.log(
    `👤 [Role Check]: ইউজারের ইমেইল: ${req.user.email}, রোল: ${req.user.role}`,
  );

  // ২. মডারেটর হলে সে অ্যাক্টিভ কিনা চেক
  if (req.user.role === "MODERATOR") {
    if (req.user.moderatorStatus === "inactive") {
      console.log("❌ [Access Denied]: মডারেটর অ্যাকাউন্টটি ইনঅ্যাক্টিভ।");
      return res
        .status(403)
        .json({ ok: false, message: "Moderator account is inactive" });
    }

    console.log("✅ [Access Granted]: মডারেটরকে অ্যাক্সেস দেওয়া হলো।");
    return next();
  }

  // ৩. অ্যাডমিন বা সুপার অ্যাডমিন হলে পাস
  if (req.user.role === "ADMIN" || req.user.role === "SUPPER ADMIN") {
    console.log("✅ [Access Granted]: অ্যাডমিনকে অ্যাক্সেস দেওয়া হলো।");
    return next();
  }

  console.log(
    `❌ [Access Denied]: এই রোলের (${req.user.role}) কোনো পারমিশন নেই।`,
  );
  return res.status(403).json({ ok: false, message: "Access denied" });
};