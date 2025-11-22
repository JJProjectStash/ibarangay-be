import { Response } from "express";
import { AuthRequest } from "../types";
import User from "../models/User";
import Service from "../models/Service";
import Complaint from "../models/Complaint";
import Event from "../models/Event";
import AuditLog from "../models/AuditLog";

/**
 * Get system statistics
 */
export const getSystemStats = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalStaff = await User.countDocuments({ role: "staff" });
    const totalResidents = await User.countDocuments({ role: "resident" });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const unverifiedUsers = await User.countDocuments({ isVerified: false });

    // Service statistics
    const totalServices = await Service.countDocuments();
    const pendingServices = await Service.countDocuments({ status: "pending" });
    const approvedServices = await Service.countDocuments({
      status: "approved",
    });
    const borrowedServices = await Service.countDocuments({
      status: "borrowed",
    });
    const returnedServices = await Service.countDocuments({
      status: "returned",
    });
    const rejectedServices = await Service.countDocuments({
      status: "rejected",
    });

    // Complaint statistics
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({
      status: "pending",
    });
    const inProgressComplaints = await Complaint.countDocuments({
      status: "in-progress",
    });
    const resolvedComplaints = await Complaint.countDocuments({
      status: "resolved",
    });
    const closedComplaints = await Complaint.countDocuments({
      status: "closed",
    });

    // Event statistics
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({
      date: { $gte: new Date() },
    });
    const pastEvents = await Event.countDocuments({
      date: { $lt: new Date() },
    });

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    const newServicesLast30Days = await Service.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    const newComplaintsLast30Days = await Complaint.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Pending approvals
    const pendingApprovals = pendingServices + pendingComplaints;

    // Average resolution time for complaints (in hours)
    const resolvedComplaintsWithTime = await Complaint.aggregate([
      {
        $match: {
          status: "resolved",
          resolvedAt: { $exists: true },
        },
      },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ["$resolvedAt", "$createdAt"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: "$resolutionTime" },
        },
      },
    ]);

    const avgComplaintResolutionTime =
      resolvedComplaintsWithTime.length > 0
        ? Math.round(resolvedComplaintsWithTime[0].avgResolutionTime)
        : 0;

    // Complaint satisfaction rating
    const complaintRatings = await Complaint.aggregate([
      {
        $match: { rating: { $exists: true, $ne: null } },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    const avgComplaintRating =
      complaintRatings.length > 0
        ? Number(complaintRatings[0].avgRating.toFixed(2))
        : 0;
    const totalComplaintRatings =
      complaintRatings.length > 0 ? complaintRatings[0].totalRatings : 0;

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          admins: totalAdmins,
          staff: totalStaff,
          residents: totalResidents,
          verified: verifiedUsers,
          unverified: unverifiedUsers,
          newLast30Days: newUsersLast30Days,
        },
        services: {
          total: totalServices,
          pending: pendingServices,
          approved: approvedServices,
          borrowed: borrowedServices,
          returned: returnedServices,
          rejected: rejectedServices,
          newLast30Days: newServicesLast30Days,
        },
        complaints: {
          total: totalComplaints,
          pending: pendingComplaints,
          inProgress: inProgressComplaints,
          resolved: resolvedComplaints,
          closed: closedComplaints,
          newLast30Days: newComplaintsLast30Days,
          avgResolutionTime: avgComplaintResolutionTime,
          avgRating: avgComplaintRating,
          totalRatings: totalComplaintRatings,
        },
        events: {
          total: totalEvents,
          upcoming: upcomingEvents,
          past: pastEvents,
        },
        pendingApprovals,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch system statistics",
    });
  }
};

/**
 * Get audit logs
 */
export const getAuditLogs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      action,
      targetType,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const query: any = {};

    if (action) {
      query.action = action;
    }

    if (targetType) {
      query.targetType = targetType;
    }

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate("userId", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch audit logs",
    });
  }
};

/**
 * Create audit log entry
 */
export const createAuditLog = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { action, targetType, targetId, details } = req.body;

    if (!action || !targetType) {
      res.status(400).json({
        success: false,
        message: "Action and target type are required",
      });
      return;
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const auditLog = await AuditLog.create({
      userId: req.user?.id,
      userName: `${user.firstName} ${user.lastName}`,
      action,
      targetType,
      targetId: targetId || undefined,
      details: details || {},
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      success: true,
      message: "Audit log created successfully",
      data: auditLog,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create audit log",
    });
  }
};

/**
 * Get audit log statistics
 */
export const getAuditLogStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery: any = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        matchQuery.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        matchQuery.createdAt.$lte = new Date(endDate as string);
      }
    }

    const stats = await AuditLog.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          byAction: [
            { $group: { _id: "$action", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byTargetType: [
            { $group: { _id: "$targetType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byUser: [
            {
              $group: {
                _id: { userId: "$userId", userName: "$userName" },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byAction: stats[0].byAction,
        byTargetType: stats[0].byTargetType,
        topUsers: stats[0].byUser,
        total: stats[0].total[0]?.count || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch audit log statistics",
    });
  }
};

/**
 * Delete old audit logs
 */
export const deleteOldAuditLogs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { daysOld = 90 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld as string));

    const result = await AuditLog.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} audit logs older than ${daysOld} days`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete old audit logs",
    });
  }
};
