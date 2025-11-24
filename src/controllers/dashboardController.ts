import { Request, Response } from "express";
import Complaint from "../models/Complaint";
import Service from "../models/Service";
import Event from "../models/Event";
import User from "../models/User";
import Announcement from "../models/Announcement";

/**
 * Dashboard Controller
 * Handles dashboard statistics and analytics endpoints
 */

/**
 * Get overall system statistics
 * @route GET /api/v1/dashboard/stats
 * @access Admin, Staff
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      totalServices,
      pendingServices,
      completedServices,
      totalUsers,
      activeUsers,
      totalEvents,
      upcomingEvents,
      totalAnnouncements,
      activeAnnouncements,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: "pending" }),
      Complaint.countDocuments({ status: "resolved" }),
      Service.countDocuments(),
      Service.countDocuments({ status: "pending" }),
      Service.countDocuments({ status: "completed" }),
      User.countDocuments({ role: "resident" }),
      User.countDocuments({ role: "resident", isActive: true }),
      Event.countDocuments(),
      Event.countDocuments({ date: { $gte: new Date() } }),
      Announcement.countDocuments(),
      Announcement.countDocuments({ isPublished: true }),
    ]);

    res.json({
      success: true,
      data: {
        complaints: {
          total: totalComplaints,
          pending: pendingComplaints,
          resolved: resolvedComplaints,
          inProgress: totalComplaints - pendingComplaints - resolvedComplaints,
        },
        services: {
          total: totalServices,
          pending: pendingServices,
          completed: completedServices,
          inProgress: totalServices - pendingServices - completedServices,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        events: {
          total: totalEvents,
          upcoming: upcomingEvents,
          past: totalEvents - upcomingEvents,
        },
        announcements: {
          total: totalAnnouncements,
          active: activeAnnouncements,
          draft: totalAnnouncements - activeAnnouncements,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

/**
 * Get recent activities for dashboard
 * @route GET /api/v1/dashboard/activities
 * @access Admin, Staff
 */
export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const [recentComplaints, recentServices, recentEvents] = await Promise.all([
      Complaint.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("userId", "name email")
        .select("title status category createdAt"),
      Service.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("userId", "name email")
        .select("title status category createdAt"),
      Event.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title date location createdAt"),
    ]);

    const activities = [
      ...recentComplaints.map((c) => ({
        type: "complaint",
        id: c._id,
        title: c.title,
        status: c.status,
        category: c.category,
        user: c.userId,
        createdAt: c.createdAt,
      })),
      ...recentServices.map((s) => ({
        type: "service",
        id: s._id,
        title: s.title,
        status: s.status,
        category: s.category,
        user: s.userId,
        createdAt: s.createdAt,
      })),
      ...recentEvents.map((e) => ({
        type: "event",
        id: e._id,
        title: e.title,
        date: e.date,
        location: e.location,
        createdAt: e.createdAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent activities",
      error: error.message,
    });
  }
};

/**
 * Get time-series data for charts
 * @route GET /api/v1/dashboard/time-series
 * @access Admin, Staff
 */
export const getTimeSeriesData = async (req: Request, res: Response) => {
  try {
    const { type = "complaints", period = "7d" } = req.query;

    const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let Model;
    switch (type) {
      case "services":
        Model = Service;
        break;
      case "events":
        Model = Event;
        break;
      default:
        Model = Complaint;
    }

    const data = await Model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      data: data.map((d) => ({
        date: d._id,
        count: d.count,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch time-series data",
      error: error.message,
    });
  }
};

/**
 * Get category distribution for pie charts
 * @route GET /api/v1/dashboard/category-distribution
 * @access Admin, Staff
 */
export const getCategoryDistribution = async (req: Request, res: Response) => {
  try {
    const { type = "complaints" } = req.query;

    let Model;
    switch (type) {
      case "services":
        Model = Service;
        break;
      default:
        Model = Complaint;
    }

    const distribution = await Model.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json({
      success: true,
      data: distribution.map((d) => ({
        category: d._id,
        count: d.count,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch category distribution",
      error: error.message,
    });
  }
};

/**
 * Get staff performance metrics
 * @route GET /api/v1/dashboard/staff-performance
 * @access Admin
 */
export const getStaffPerformance = async (req: Request, res: Response) => {
  try {
    const staffMembers = await User.find({ role: "staff" }).select(
      "name email",
    );

    const performance = await Promise.all(
      staffMembers.map(async (staff) => {
        const [
          assignedComplaints,
          resolvedComplaints,
          assignedServices,
          completedServices,
        ] = await Promise.all([
          Complaint.countDocuments({ assignedTo: staff._id }),
          Complaint.countDocuments({
            assignedTo: staff._id,
            status: "resolved",
          }),
          Service.countDocuments({ assignedTo: staff._id }),
          Service.countDocuments({
            assignedTo: staff._id,
            status: "completed",
          }),
        ]);

        return {
          staff: {
            id: staff._id,
            name: staff.name,
            email: staff.email,
          },
          complaints: {
            assigned: assignedComplaints,
            resolved: resolvedComplaints,
            resolutionRate:
              assignedComplaints > 0
                ? ((resolvedComplaints / assignedComplaints) * 100).toFixed(2)
                : 0,
          },
          services: {
            assigned: assignedServices,
            completed: completedServices,
            completionRate:
              assignedServices > 0
                ? ((completedServices / assignedServices) * 100).toFixed(2)
                : 0,
          },
        };
      }),
    );

    res.json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff performance",
      error: error.message,
    });
  }
};
