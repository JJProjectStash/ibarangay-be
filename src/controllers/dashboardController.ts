import { Response } from "express";
import Complaint from "../models/Complaint";
import Service from "../models/Service";
import Event from "../models/Event";
import User from "../models/User";
import { AuthRequest, DashboardStats } from "../types";

export const getDashboardStats = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      totalServices,
      totalEvents,
      totalUsers,
      complaintsByCategory,
      complaintsByPriority,
      recentComplaints,
      recentServices,
      recentEvents,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: "pending" }),
      Complaint.countDocuments({ status: "in-progress" }),
      Complaint.countDocuments({ status: "resolved" }),
      Service.countDocuments(),
      Event.countDocuments(),
      User.countDocuments(),
      Complaint.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { category: "$_id", count: 1, _id: 0 } },
      ]),
      Complaint.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $project: { priority: "$_id", count: 1, _id: 0 } },
      ]),
      Complaint.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("userId", "firstName lastName")
        .select("title status priority createdAt"),
      Service.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("userId", "firstName lastName")
        .select("itemName status createdAt"),
      Event.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("organizer", "firstName lastName")
        .select("title status eventDate"),
    ]);

    // Calculate average resolution time
    const resolutionStats = await Complaint.aggregate([
      {
        $match: {
          status: "resolved",
          resolvedAt: { $exists: true },
        },
      },
      {
        $project: {
          resolutionTime: {
            $subtract: ["$resolvedAt", "$createdAt"],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$resolutionTime" },
        },
      },
    ]);

    const averageResolutionTime = resolutionStats[0]?.avgTime || 0;
    const averageResolutionDays = Math.round(
      averageResolutionTime / (1000 * 60 * 60 * 24)
    );

    const recentActivity = [
      ...recentComplaints.map((c: any) => ({
        type: "complaint",
        title: c.title,
        status: c.status,
        user: c.userId,
        createdAt: c.createdAt,
      })),
      ...recentServices.map((s: any) => ({
        type: "service",
        title: s.itemName,
        status: s.status,
        user: s.userId,
        createdAt: s.createdAt,
      })),
      ...recentEvents.map((e: any) => ({
        type: "event",
        title: e.title,
        status: e.status,
        user: e.organizer,
        createdAt: e.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    const stats: DashboardStats = {
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      totalServices,
      totalEvents,
      totalUsers,
      complaintsByCategory,
      complaintsByPriority,
      recentActivity,
      averageResolutionTime: averageResolutionDays,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard statistics",
    });
  }
};

export const getUserDashboard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    const [
      myComplaints,
      myServices,
      myEvents,
      pendingComplaints,
      resolvedComplaints,
    ] = await Promise.all([
      Complaint.countDocuments({ userId }),
      Service.countDocuments({ userId }),
      Event.countDocuments({ attendees: userId }),
      Complaint.countDocuments({ userId, status: "pending" }),
      Complaint.countDocuments({ userId, status: "resolved" }),
    ]);

    const recentComplaints = await Complaint.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title status priority createdAt");

    const recentServices = await Service.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("itemName status borrowDate");

    const upcomingEvents = await Event.find({
      attendees: userId,
      eventDate: { $gte: new Date() },
      status: "upcoming",
    })
      .sort({ eventDate: 1 })
      .limit(5)
      .select("title eventDate location");

    res.status(200).json({
      success: true,
      data: {
        summary: {
          myComplaints,
          myServices,
          myEvents,
          pendingComplaints,
          resolvedComplaints,
        },
        recentComplaints,
        recentServices,
        upcomingEvents,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user dashboard",
    });
  }
};
