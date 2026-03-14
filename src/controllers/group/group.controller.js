import mongoose from "mongoose";

import Group from "../../models/group/group.model.js";
import GroupMember from "../../models/group/groupMember.model.js";
import {
  normalizeRules,
  slugify,
  validateCreateGroupBody,
} from "../../models/group/group.validation.js";
import User from "../../models/user/user.model.js";
import Follow from "../../models/follow/follow.model.js";
import { canManageMembers } from "../../helpers/groupPostHelper.js";

const makeUniqueSlug = async (base) => {
  let slug = base || `group-${Date.now()}`;
  let i = 0;

  // ✅ try few times
  while (await Group.exists({ slug })) {
    i += 1;
    slug = `${base}-${i}`;
    if (i > 20) slug = `${base}-${Date.now()}`;
  }
  return slug;
};

export const createGroup = async (req, res) => {
  const me = req.user?._id;
  if (!me) return res.status(401).json({ message: "Unauthorized" });

  const check = validateCreateGroupBody(req.body);
  if (!check.ok) return res.status(400).json({ message: check.message });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const name = String(req.body.name).trim();
    const privacy = String(req.body.privacy).trim();

    const about = String(req.body?.about || "").trim();
    const coverUrl = {
      key: String(req.body.coverUrl.key),
      url: String(req.body.coverUrl?.url),
      provider: String(req.body.coverUrl?.provider),
    };
    const category = String(req.body?.category || "").trim();

    const location = {
      country: String(req.body?.location?.country || "").trim(),
      city: String(req.body?.location?.city || "").trim(),
    };

    const rules = normalizeRules(req.body?.rules);

    const approval = {
      // ✅ default suggestion: private হলে member approval true
      memberApprovalRequired:
        typeof req.body?.approval?.memberApprovalRequired === "boolean"
          ? req.body.approval.memberApprovalRequired
          : privacy === "private",
      postApprovalRequired:
        typeof req.body?.approval?.postApprovalRequired === "boolean"
          ? req.body.approval.postApprovalRequired
          : false,
    };

    const baseSlug = slugify(name);
    const slug = await makeUniqueSlug(baseSlug);

    const group = await Group.create(
      [
        {
          name,
          slug,
          privacy,
          coverUrl,
          about,
          category,
          location,
          rules,
          approval,
          counts: { members: 1, posts: 0 },
          createdBy: me,
        },
      ],
      { session },
    );

    // ✅ creator is admin & active member
    await GroupMember.create(
      [
        {
          groupId: group[0]._id,
          userId: me,
          role: "admin",
          status: "active",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Group created",
      data: group[0],
    });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json({ message: e?.message || "Create group failed" });
  }
};

// POST /groups/:id/join
export const joinGroup = async (req, res) => {
  const me = req.user?._id;
  const groupId = req.params.id;

  if (!me) return res.status(401).json({ message: "Unauthorized" });
  if (!mongoose.isValidObjectId(groupId)) {
    return res.status(400).json({ message: "Invalid group id" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const group = await Group.findById(groupId)
      .select("_id privacy approval isDeleted counts")
      .session(session)
      .lean();

    if (!group || group.isDeleted) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Group not found" });
    }

    // ✅ existing membership (NOTE: lean বাদ দিলাম যাতে update করা যায়)
    const existing = await GroupMember.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId: new mongoose.Types.ObjectId(me),
    }).session(session);

    if (existing) {
      // ✅ blocked
      if (existing.status === "blocked") {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(403)
          .json({ message: "You are blocked in this group" });
      }

      // ✅ invited => accept join
      if (existing.status === "invited") {
        existing.status = "active";
        await existing.save({ session });

        await Group.updateOne(
          { _id: groupId },
          { $inc: { "counts.members": 1 } },
          { session },
        );

        await session.commitTransaction();
        session.endSession();

        return res.json({
          success: true,
          message: "Joined",
          data: { groupId, status: "active", role: existing.role },
        });
      }

      // ✅ already active / already requested
      await session.commitTransaction();
      session.endSession();

      return res.json({
        success: true,
        message:
          existing.status === "active"
            ? "Already joined"
            : "Join request already sent",
        data: {
          groupId,
          status: existing.status,
          role: existing.role,
        },
      });
    }

    /**
     * ✅ তোমার requirement:
     * - public => direct join (active)
     * - private => request (requested)
     * + extra: public group এ admin approval on করলে => requested
     */
    const approvalRequired =
      group.privacy === "private"
        ? true
        : group?.approval?.memberApprovalRequired === true;

    const status =
      group.privacy === "public" && !approvalRequired ? "active" : "requested";

    // create membership
    await GroupMember.create(
      [
        {
          groupId: new mongoose.Types.ObjectId(groupId),
          userId: new mongoose.Types.ObjectId(me),
          role: "member",
          status, // ✅ active | requested
        },
      ],
      { session },
    );

    // only active member increases count
    if (status === "active") {
      await Group.updateOne(
        { _id: groupId },
        { $inc: { "counts.members": 1 } },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: status === "active" ? "Joined" : "Join request sent",
      data: { groupId, status },
    });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ message: e?.message || "Join failed" });
  }
};

// helper for get my groups with cursor pagination
const parseCursor = (raw) => {
  try {
    if (!raw) return null;
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
};
const buildCursorFilter = (cursor) => {
  if (!cursor?.createdAt || !cursor?._id) return {};
  return {
    $or: [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      {
        createdAt: new Date(cursor.createdAt),
        _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
      },
    ],
  };
};

// cursor = { score, createdAt, _id }
const buildScoreCursorMatchStage = (cursor) => {
  if (!cursor?.score && cursor?.score !== 0) return null;
  if (!cursor?.createdAt || !cursor?._id) return null;

  const createdAt = new Date(cursor.createdAt);
  const oid = new mongoose.Types.ObjectId(cursor._id);
  const score = Number(cursor.score) || 0;

  return {
    $match: {
      $or: [
        { score: { $lt: score } },
        { score, createdAt: { $lt: createdAt } },
        { score, createdAt, _id: { $lt: oid } },
      ],
    },
  };
};

// GET /groups/for-you?limit=20&cursor=...&country=...&city=...
export const getForYouGroups = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);

    // ✅ 1) Get my location (fallback: query param)
    const meUser = await User.findById(me).select("country city").lean();

    // ✅ normalize to lowercase (IMPORTANT)
    const myCountry = (req.query.country || meUser?.country || "")
      .toString()
      .trim()
      .toLowerCase();

    const myCity = (req.query.city || meUser?.city || "")
      .toString()
      .trim()
      .toLowerCase();

    // ✅ 2) Get following user ids
    const followingDocs = await Follow.find({ follower: me })
      .select("following")
      .lean();

    const followingIds = followingDocs
      .map((f) => f.following)
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));

    // ✅ 3) Exclude groups where I'm already member/requested/invited/blocked
    const myMemberships = await GroupMember.find({ userId: me })
      .select("groupId")
      .lean();

    const excludeGroupIds = myMemberships
      .map((m) => m.groupId)
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));

    // ✅ 4) Build pipeline
    const pipeline = [
      // base groups (not deleted + exclude mine memberships)
      {
        $match: {
          isDeleted: { $ne: true },
          ...(excludeGroupIds.length ? { _id: { $nin: excludeGroupIds } } : {}),
        },
      },

      // ✅ MUTUAL: count active members who are in my following list
      {
        $lookup: {
          from: "groupmembers",
          let: { gid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$groupId", "$$gid"] },
                status: "active",
                ...(followingIds.length
                  ? { userId: { $in: followingIds } }
                  : { userId: { $in: [] } }),
              },
            },
            { $group: { _id: "$groupId", mutualCount: { $sum: 1 } } },
            { $project: { _id: 0, mutualCount: 1 } },
          ],
          as: "mutualAgg",
        },
      },

      // mutualCount = number
      {
        $addFields: {
          mutualCount: {
            $ifNull: [{ $first: "$mutualAgg.mutualCount" }, 0],
          },
        },
      },

      // ✅ normalize group location (lowercase) then compare
      {
        $addFields: {
          _countryLc: { $toLower: { $ifNull: ["$location.country", ""] } },
          _cityLc: { $toLower: { $ifNull: ["$location.city", ""] } },
        },
      },

      // ✅ Location match flags (case-insensitive)
      {
        $addFields: {
          matchCountry: myCountry.length
            ? { $eq: ["$_countryLc", myCountry] }
            : false,
          matchCity: myCity.length ? { $eq: ["$_cityLc", myCity] } : false,
        },
      },

      // ✅ SCORE
      {
        $addFields: {
          score: {
            $add: [
              { $cond: ["$matchCountry", 20, 0] },
              { $cond: ["$matchCity", 40, 0] },
              { $multiply: ["$mutualCount", 10] },
            ],
          },
        },
      },

      // ✅ cursor pagination AFTER score computed
      ...(buildScoreCursorMatchStage(cursor)
        ? [buildScoreCursorMatchStage(cursor)]
        : []),

      // ✅ sort by score then latest
      { $sort: { score: -1, createdAt: -1, _id: -1 } },
      { $limit: take },

      // ✅ clean project
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          privacy: 1,
          coverUrl: 1,
          about: 1,
          category: 1,
          location: 1,
          counts: 1,
          createdBy: 1,
          createdAt: 1,
          updatedAt: 1,

          mutualCount: 1,
          matchCountry: 1,
          matchCity: 1,
          score: 1,
        },
      },
    ];

    const items = await Group.aggregate(pipeline);

    const nextCursor =
      items.length > 0
        ? {
            score: items[items.length - 1].score || 0,
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({
      success: true,
      items,
      nextCursor,
      // ✅ debug optional (remove later)
      debug: {
        myCountry,
        myCity,
        excludeCount: excludeGroupIds.length,
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch for-you groups failed" });
  }
};


// get my created group and my joined group helper
const createdCursorFilter = (cursor) => {
  if (!cursor?.createdAt || !cursor?._id) return {};
  return {
    $or: [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      {
        createdAt: new Date(cursor.createdAt),
        _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
      },
    ],
  };
};
// get my created group and my joined group helper
const joinedCursorFilter = (cursor) => {
  // joined section এ cursor applies to GroupMember.createdAt + GroupMember._id
  if (!cursor?.createdAt || !cursor?._id) return {};
  return {
    $or: [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      {
        createdAt: new Date(cursor.createdAt),
        _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
      },
    ],
  };
};

// get my created group and my joined group api
export const getMyYourGroups = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);

    // optional status filter (for joined memberships only)
    const status = String(req.query.status || "").trim();
    const statusFilter =
      status === "active" || status === "requested"
        ? { status }
        : { status: { $in: ["active", "requested"] } };

    const cursor = parseCursor(req.query.cursor);

    // section: 0 => created, 1 => joined
    const startSection = cursor?.section === 1 ? 1 : 0;

    const out = [];

    /* ---------------------------------------------
     * 1) CREATED FIRST (only when startSection === 0)
     * --------------------------------------------- */
    if (startSection === 0) {
      const createdLimit = take;

      const createdRows = await Group.aggregate([
        {
          $match: {
            createdBy: new mongoose.Types.ObjectId(me),
            isDeleted: { $ne: true },
            ...(cursor?.section === 0 ? createdCursorFilter(cursor) : {}),
          },
        },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: createdLimit },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            privacy: 1,
            coverUrl: 1,
            about: 1,
            category: 1,
            location: 1,
            counts: 1,
            createdBy: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      // normalize shape => same array
      for (const g of createdRows) {
        out.push({
          section: 0,
          status: "active",
          role: "owner",
          membershipId: null,
          createdAt: g.createdAt, // for cursor
          _id: g._id, // for cursor
          group: g,
        });
      }

      // if created not enough fill -> fetch joined for remaining
      const remaining = take - out.length;
      if (remaining > 0) {
        const joinedRows = await GroupMember.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(me),
              ...statusFilter,
              // start joined from beginning (no cursor) because we are still in section 0 page
            },
          },
          { $sort: { createdAt: -1, _id: -1 } },
          { $limit: remaining },

          {
            $lookup: {
              from: "groups",
              localField: "groupId",
              foreignField: "_id",
              as: "group",
            },
          },
          { $unwind: "$group" },

          // ignore deleted
          { $match: { "group.isDeleted": { $ne: true } } },

          // ✅ IMPORTANT: exclude groups created by me (so created groups never repeat here)
          {
            $match: {
              "group.createdBy": { $ne: new mongoose.Types.ObjectId(me) },
            },
          },

          {
            $project: {
              _id: 1, // membership id
              createdAt: 1, // membership createdAt (join time)
              status: 1,
              role: 1,
              groupId: 1,
              group: {
                _id: "$group._id",
                name: "$group.name",
                slug: "$group.slug",
                privacy: "$group.privacy",
                coverUrl: "$group.coverUrl",
                about: "$group.about",
                category: "$group.category",
                location: "$group.location",
                counts: "$group.counts",
                createdBy: "$group.createdBy",
                createdAt: "$group.createdAt",
                updatedAt: "$group.updatedAt",
              },
            },
          },
        ]);

        for (const m of joinedRows) {
          out.push({
            section: 1,
            status: m.status,
            role: m.role,
            membershipId: m._id,
            createdAt: m.createdAt, // join time for cursor
            _id: m._id, // membership id for cursor
            group: m.group,
          });
        }
      }
    }

    /* ---------------------------------------------
     * 2) JOINED ONLY (when cursor.section === 1)
     * --------------------------------------------- */
    if (startSection === 1) {
      const joinedRows = await GroupMember.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(me),
            ...statusFilter,
            ...(cursor?.section === 1 ? joinedCursorFilter(cursor) : {}),
          },
        },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: take },

        {
          $lookup: {
            from: "groups",
            localField: "groupId",
            foreignField: "_id",
            as: "group",
          },
        },
        { $unwind: "$group" },

        { $match: { "group.isDeleted": { $ne: true } } },
        {
          $match: {
            "group.createdBy": { $ne: new mongoose.Types.ObjectId(me) },
          },
        },

        {
          $project: {
            _id: 1,
            createdAt: 1,
            status: 1,
            role: 1,
            groupId: 1,
            group: {
              _id: "$group._id",
              name: "$group.name",
              slug: "$group.slug",
              privacy: "$group.privacy",
              coverUrl: "$group.coverUrl",
              about: "$group.about",
              category: "$group.category",
              location: "$group.location",
              counts: "$group.counts",
              createdBy: "$group.createdBy",
              createdAt: "$group.createdAt",
              updatedAt: "$group.updatedAt",
            },
          },
        },
      ]);

      for (const m of joinedRows) {
        out.push({
          section: 1,
          status: m.status,
          role: m.role,
          membershipId: m._id,
          createdAt: m.createdAt,
          _id: m._id,
          group: m.group,
        });
      }
    }

    // ✅ nextCursor => last item info
    const last = out[out.length - 1];
    const nextCursor = last
      ? {
          section: last.section,
          createdAt: last.createdAt,
          _id: String(last._id),
        }
      : null;

    return res.json({
      success: true,
      items: out, // ✅ single array (created first then joined)
      nextCursor,
    });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Fetch your groups failed",
    });
  }
};


// get group details 
export const getGroupDetails = async (req, res) => {
  try {
    const me = req.user?._id; // auth থাকলে
    const groupId = String(req.params.groupId || "").trim();
    console.log('group id',groupId);
    

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    // ✅ group fetch (not deleted)
    const group = await Group.findOne({
      _id: new mongoose.Types.ObjectId(groupId),
      isDeleted: { $ne: true },
    })
      .select(
        "_id name slug privacy coverUrl about category location counts createdAt updatedAt creatorId",
      )
      .lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // ✅ optional: my membership (joined status/role)
    // (auth না থাকলে null থাকবে)
    let myMembership = null;

    if (me) {
      myMembership = await GroupMember.findOne({
        groupId: new mongoose.Types.ObjectId(groupId),
        userId: new mongoose.Types.ObjectId(me),
        status: { $in: ["active", "requested"] },
      })
        .select("_id status role createdAt")
        .lean();
    }

    // ✅ normalize counts fallback
    const counts = group.counts || {};
    const payload = {
      _id: group._id,
      name: group.name,
      slug: group.slug,
      privacy: group.privacy,
      coverUrl: group.coverUrl,
      about: group.about,
      category: group.category,
      location: group.location,
      counts: {
        members: Number(counts.members || 0),
        posts: Number(counts.posts || 0),
        // add more if you have
      },
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,

      // ✅ extra helpful fields for UI
      isCreatedByMe: me ? String(group.creatorId) === String(me) : false,
      myMembership: myMembership
        ? {
            _id: myMembership._id,
            status: myMembership.status, // active/requested
            role: myMembership.role, // member/mod/admin...
            joinedAt: myMembership.createdAt,
          }
        : null,
    };

    return res.json({ success: true, group: payload });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch group details failed" });
  }
};


// GET /groups/:groupId/requests?limit=20&cursor=... join request get 
export const getGroupJoinRequests = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId } = req.params;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    // admin check
    const myMem = await GroupMember.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId: new mongoose.Types.ObjectId(me),
      status: "active",
      role: { $in: ["admin", "moderator", "owner"] },
    }).lean();

    if (!myMem) return res.status(403).json({ message: "Not allowed" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const rows = await GroupMember.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      status: "requested",
      ...cursorFilter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(take)
      .populate("userId", "name avatarUrl avatarKey")
      .lean();

    const items = rows.map(r => ({
      _id: r._id, // membershipId
      createdAt: r.createdAt,
      user: r.userId
        ? {
            _id: r.userId._id,
            name: r.userId.name,
            avatarUrl: r.userId.avatarUrl,
            avatarKey: r.userId.avatarKey,
          }
        : null,
    }));

    const nextCursor =
      rows.length > 0
        ? { createdAt: rows[rows.length - 1].createdAt, _id: rows[rows.length - 1]._id }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Fetch requests failed" });
  }
};

export const getGroupMembers = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId } = req.params;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    // ✅ only admin/mod/owner can view member lists (especially requested/blocked)
    const perm = await canManageMembers({ me, groupId });
    if (!perm.ok) return res.status(perm.code).json({ message: perm.message });

    const take = Math.min(Number(req.query.limit) || 50, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const statusRaw = String(req.query.status || "requested").trim();
    const status =
      statusRaw === "active" ||
      statusRaw === "blocked" ||
      statusRaw === "requested"
        ? statusRaw
        : "requested";

    const gid = new mongoose.Types.ObjectId(groupId);

    const rows = await GroupMember.aggregate([
      {
        $match: {
          groupId: gid,
          status,
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: take },

      // ✅ join user
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1, // membershipId
          membershipId: "$_id",
          groupId: 1,
          userId: 1,
          role: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            _id: "$user._id",
            name: "$user.name",
            avatarUrl: "$user.avatarUrl",
            avatarKey: "$user.avatarKey",
          },
        },
      },
    ]);

    const nextCursor =
      rows.length > 0
        ? {
            createdAt: rows[rows.length - 1].createdAt,
            _id: rows[rows.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items: rows, nextCursor });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch group members failed" });
  }
};


// PATCH /groups/:groupId/members/:memberId/status
export const updateGroupMemberStatus = async (req, res) => {
  const me = req.user?._id;
  const { groupId, memberId } = req.params;

  if (!me) return res.status(401).json({ message: "Unauthorized" });
  if (!mongoose.isValidObjectId(groupId) || !mongoose.isValidObjectId(memberId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const nextStatus = String(req.body?.status || "").trim(); // active/rejected/blocked
  const allowed = ["active", "rejected", "blocked"];
  if (!allowed.includes(nextStatus)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ✅ 1) must be admin/mod/owner of this group
    const myMem = await GroupMember.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId: new mongoose.Types.ObjectId(me),
      status: "active",
      role: { $in: ["admin", "moderator", "owner"] }, // তোমার role list অনুযায়ী
    }).session(session);

    if (!myMem) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "You are not allowed" });
    }

    // ✅ 2) target membership
    const mem = await GroupMember.findOne({
      _id: new mongoose.Types.ObjectId(memberId),
      groupId: new mongoose.Types.ObjectId(groupId),
    }).session(session);

    if (!mem) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Member not found" });
    }

    const prevStatus = mem.status;

    // ✅ already same
    if (prevStatus === nextStatus) {
      await session.commitTransaction();
      session.endSession();
      return res.json({ success: true, message: "No change", item: mem });
    }

    // ✅ 3) update status
    mem.status = nextStatus;
    await mem.save({ session });

    // ✅ 4) group counts fix (only when status changes affect member count)
    // rule: only "active" members are counted in Group.counts.members
    const wasActive = prevStatus === "active";
    const willBeActive = nextStatus === "active";

    if (!wasActive && willBeActive) {
      await Group.updateOne(
        { _id: new mongoose.Types.ObjectId(groupId) },
        { $inc: { "counts.members": 1 } },
        { session }
      );
    } else if (wasActive && !willBeActive) {
      await Group.updateOne(
        { _id: new mongoose.Types.ObjectId(groupId) },
        { $inc: { "counts.members": -1 } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message:
        nextStatus === "active"
          ? "Accepted"
          : nextStatus === "rejected"
          ? "Rejected"
          : "Blocked",
      item: mem,
    });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ message: e?.message || "Update failed" });
  }
};
