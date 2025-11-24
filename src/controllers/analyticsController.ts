import { Response } from "express";
import Complaint from "../models/Complaint";
import { AuthRequest } from "../types";

export const getTimeSeriesData = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { period = "daily", days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    let groupBy: any;
    if (period === "monthly") {
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
    } else if (period === "weekly") {
      groupBy = {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      };
    } else {
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    }

    const timeSeriesData = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupBy,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          closed: {
            $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: timeSeriesData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch time series data",
    });
  }
};

export const getStaffPerformance = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate as string);
    }

    const staffPerformance = await Complaint.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$assignedTo",
          totalAssigned: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          avgRating: { $avg: "$rating" },
          totalRatings: {
            $sum: { $cond: [{ $ne: ["$rating", null] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "staff",
        },
      },
      { $unwind: { path: "$staff", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          staffId: "$_id",
          staffName: {
            $concat: ["$staff.firstName", " ", "$staff.lastName"],
          },
          email: "$staff.email",
          totalAssigned: 1,
          resolved: 1,
          inProgress: 1,
          pending: 1,
          resolutionRate: {
            $cond: [
              { $eq: ["$totalAssigned", 0] },
              0,
              {
                $multiply: [{ $divide: ["$resolved", "$totalAssigned"] }, 100],
              },
            ],
          },
          avgRating: { $round: ["$avgRating", 2] },
          totalRatings: 1,
        },
      },
      { $sort: { resolutionRate: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: staffPerformance,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch staff performance",
    });
  }
};

export const getCategoryAnalytics = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const categoryStats = await Complaint.aggregate([
      {
        $group: {
          _id: "$category",
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ["$resolvedAt", null] },
                { $subtract: ["$resolvedAt", "$createdAt"] },
                null,
              ],
            },
          },
          avgRating: { $avg: "$rating" },
        },
      },
      {
        $project: {
          category: "$_id",
          total: 1,
          pending: 1,
          inProgress: 1,
          resolved: 1,
          resolutionRate: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              {
                $multiply: [{ $divide: ["$resolved", "$total"] }, 100],
              },
            ],
          },
          avgResolutionTimeHours: {
            $round: [{ $divide: ["$avgResolutionTime", 3600000] }, 2],
          },
          avgRating: { $round: ["$avgRating", 2] },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: categoryStats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch category analytics",
    });
  }
};

export const getResponseTimeAnalytics = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const responseTimeStats = await Complaint.aggregate([
      {
        $match: {
          resolvedAt: { $exists: true },
        },
      },
      {
        $project: {
          category: 1,
          priority: 1,
          resolutionTime: {
            $subtract: ["$resolvedAt", "$createdAt"],
          },
        },
      },
      {
        $group: {
          _id: {
            category: "$category",
            priority: "$priority",
          },
          avgResolutionTime: { $avg: "$resolutionTime" },
          minResolutionTime: { $min: "$resolutionTime" },
          maxResolutionTime: { $max: "$resolutionTime" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: "$_id.category",
          priority: "$_id.priority",
          avgResolutionHours: {
            $round: [{ $divide: ["$avgResolutionTime", 3600000] }, 2],
          },
          minResolutionHours: {
            $round: [{ $divide: ["$minResolutionTime", 3600000] }, 2],
          },
          maxResolutionHours: {
            $round: [{ $divide: ["$maxResolutionTime", 3600000] }, 2],
          },
          count: 1,
        },
      },
      { $sort: { category: 1, priority: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: responseTimeStats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch response time analytics",
    });
  }
};

export const getTrendAnalysis = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const trends = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            week: { $week: "$createdAt" },
          },
          totalComplaints: { $sum: 1 },
          highPriority: {
            $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ["$resolvedAt", null] },
                { $subtract: ["$resolvedAt", "$createdAt"] },
                null,
              ],
            },
          },
          resolutionRate: {
            $avg: {
              $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          period: "$_id",
          totalComplaints: 1,
          highPriority: 1,
          avgResolutionHours: {
            $round: [{ $divide: ["$avgResolutionTime", 3600000] }, 2],
          },
          resolutionRate: {
            $round: [{ $multiply: ["$resolutionRate", 100] }, 2],
          },
        },
      },
      { $sort: { "period.year": 1, "period.month": 1, "period.week": 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch trend analysis",
    });
  }
};

export const getMonthlyReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { year, month } = req.query;

    const targetYear = year ? Number(year) : new Date().getFullYear();
    const targetMonth = month ? Number(month) : new Date().getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const [complaintStats, staffStats, categoryStats] = await Promise.all([
      // Overall complaint statistics
      Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
            },
            resolved: {
              $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
            },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $ne: ["$resolvedAt", null] },
                  { $subtract: ["$resolvedAt", "$createdAt"] },
                  null,
                ],
              },
            },
            avgRating: { $avg: "$rating" },
          },
        },
      ]),

      // Staff performance
      Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            assignedTo: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$assignedTo",
            assigned: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "staff",
          },
        },
        { $unwind: "$staff" },
        {
          $project: {
            name: {
              $concat: ["$staff.firstName", " ", "$staff.lastName"],
            },
            assigned: 1,
            resolved: 1,
          },
        },
      ]),

      // Category breakdown
      Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: {
          year: targetYear,
          month: targetMonth,
          startDate,
          endDate,
        },
        overview: complaintStats[0] || {},
        staffPerformance: staffStats,
        categoryBreakdown: categoryStats,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate monthly report",
    });
  }
};
