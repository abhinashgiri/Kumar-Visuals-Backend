
import User from "../models/User.model.js";
import Order from "../models/Order.model.js";
import MembershipPlan from "../models/MembershipPlan.model.js";

/**
 * @param {Object} query - Express request query
 * @returns {{from: Date, to: Date}}
 */
function parseRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fallback to last 7 days if invalid dates are provided
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    const now = new Date();
    return {
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
    };
  }

  return { from, to };
}

/**
 * @param {string} groupBy - day | month
 * @returns {string}
 */
function dateFormatFor(groupBy = "day") {
  return groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";
}


export async function usersReport(req, res) {
  try {
    const { from, to } = parseRange(req.query);
    const groupBy = (req.query.groupBy || "day").toLowerCase();
    const dateFmt = dateFormatFor(groupBy);

    const pipeline = [
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: "$createdAt" } },
          newUsers: { $sum: 1 },
          firstDate: { $min: "$createdAt" },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const raw = await User.aggregate(pipeline).allowDiskUse(true);

    let baseTotal = 0;
    if (raw.length) {
      const firstBucketDate = new Date(raw[0].firstDate);
      baseTotal = await User.countDocuments({
        createdAt: { $lt: firstBucketDate },
      });
    } else {
      baseTotal = await User.countDocuments({ createdAt: { $lte: to } });
    }

    const points = [];
    let runningTotal = baseTotal;

    for (const record of raw) {
      const increment = Number(record.newUsers || 0);
      runningTotal += increment;

      points.push({
        label: record._id,
        newUsers: increment,
        totalUsers: runningTotal,
      });
    }

    if (!points.length) {
      const label =
        groupBy === "month"
          ? `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, "0")}`
          : `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, "0")}-${String(
              to.getUTCDate()
            ).padStart(2, "0")}`;

      points.push({ label, newUsers: 0, totalUsers: baseTotal });
    }

    return res.json({ points });
  } catch (err) {
    console.error("usersReport error:", err);
    return res.status(500).json({
      error: "Failed to generate users report",
      details: String(err),
    });
  }
}


export async function membershipsReport(req, res) {
  try {
    const { from, to } = parseRange(req.query);

    const pipeline = [
      {
        $match: {
          membershipPlanKey: { $ne: null },
          status: "PAID",
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: "$membershipPlanKey",
          signups: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          planKey: "$_id",
          signups: 1,
        },
      },
      { $sort: { signups: -1 } },
    ];

    const aggregated = await Order.aggregate(pipeline).allowDiskUse(true);

    if (!aggregated.length) {
      try {
        const plans = await MembershipPlan.find({}).lean();
        return res.json({
          points: (plans || []).map((plan) => ({
            planKey: plan.key,
            planName: plan.name,
            signups: 0,
          })),
        });
      } catch {
        return res.json({ points: [] });
      }
    }

    const planKeys = aggregated.map((r) => r.planKey);
    const plans = await MembershipPlan.find({
      key: { $in: planKeys },
    }).lean();

    const planNameMap = new Map(plans.map((p) => [p.key, p.name]));

    const points = aggregated.map((r) => ({
      planKey: r.planKey,
      planName: planNameMap.get(r.planKey) ?? r.planKey,
      signups: r.signups,
    }));

    return res.json({ points });
  } catch (err) {
    console.error("membershipsReport error:", err);
    return res.status(500).json({
      error: "Failed to generate memberships report",
      details: String(err),
    });
  }
}


export async function downloadsReport(req, res) {
  try {
    const { from, to } = parseRange(req.query);
    const groupBy = (req.query.groupBy || "day").toLowerCase();
    const dateFmt = dateFormatFor(groupBy);

    const pipeline = [
      {
        $match: {
          status: "PAID",
          createdAt: { $gte: from, $lte: to },
        },
      },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: "$createdAt" } },
          downloads: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          label: "$_id",
          downloads: 1,
        },
      },
    ];

    const points = await Order.aggregate(pipeline).allowDiskUse(true);

    if (!points.length) {
      const label =
        groupBy === "month"
          ? `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, "0")}`
          : `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, "0")}-${String(
              to.getUTCDate()
            ).padStart(2, "0")}`;

      return res.json({ points: [{ label, downloads: 0 }] });
    }

    return res.json({ points });
  } catch (err) {
    console.error("downloadsReport error:", err);
    return res.status(500).json({
      error: "Failed to generate downloads report",
      details: String(err),
    });
  }
}
