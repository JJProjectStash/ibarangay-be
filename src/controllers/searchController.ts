import { Request, Response } from "express";
import Complaint from "../models/Complaint";
import Service from "../models/Service";
import Event from "../models/Event";
import Announcement from "../models/Announcement";
import User from "../models/User";

/**
 * Search Controller
 * Handles global search and advanced filtering
 */

/**
 * Global search across all entities
 * @route GET /api/v1/search/global
 * @access Authenticated
 */
export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;
    const user = (req as any).user;

    if (!q || typeof q !== "string") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchRegex = { $regex: q, $options: "i" };
    const results: any = {
      complaints: [],
      services: [],
      events: [],
      announcements: [],
      users: [],
    };

    // Search complaints
    if (!type || type === "complaints") {
      const complaintFilter: any = {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
        ],
      };

      // Residents can only see their own complaints
      if (user.role === "resident") {
        complaintFilter.userId = user.id;
      }

      results.complaints = await Complaint.find(complaintFilter)
        .limit(20)
        .populate("userId", "name email")
        .populate("assignedTo", "name email")
        .select("title description category status createdAt")
        .sort({ createdAt: -1 });
    }

    // Search services
    if (!type || type === "services") {
      const serviceFilter: any = {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
        ],
      };

      // Residents can only see their own services
      if (user.role === "resident") {
        serviceFilter.userId = user.id;
      }

      results.services = await Service.find(serviceFilter)
        .limit(20)
        .populate("userId", "name email")
        .populate("assignedTo", "name email")
        .select("title description category status createdAt")
        .sort({ createdAt: -1 });
    }

    // Search events
    if (!type || type === "events") {
      results.events = await Event.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
        ],
      })
        .limit(20)
        .select("title description date location createdAt")
        .sort({ date: -1 });
    }

    // Search announcements (published only for residents)
    if (!type || type === "announcements") {
      const announcementFilter: any = {
        $or: [{ title: searchRegex }, { content: searchRegex }],
      };

      if (user.role === "resident") {
        announcementFilter.isPublished = true;
      }

      results.announcements = await Announcement.find(announcementFilter)
        .limit(20)
        .populate("createdBy", "name email")
        .select("title content category isPublished createdAt")
        .sort({ createdAt: -1 });
    }

    // Search users (admin only)
    if (user.role === "admin" && (!type || type === "users")) {
      results.users = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ],
      })
        .limit(20)
        .select("name email phone role isActive createdAt")
        .sort({ createdAt: -1 });
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce(
      (sum: number, arr: any) => sum + arr.length,
      0,
    );

    res.json({
      success: true,
      query: q,
      totalResults,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

/**
 * Advanced filter for complaints
 * @route GET /api/v1/search/complaints/filter
 * @access Authenticated
 */
export const filterComplaints = async (req: Request, res: Response) => {
  try {
    const {
      status,
      category,
      priority,
      assignedTo,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const user = (req as any).user;
    const filter: any = {};

    // Residents can only see their own complaints
    if (user.role === "resident") {
      filter.userId = user.id;
    }

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate("userId", "name email")
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: complaints,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Filter failed",
      error: error.message,
    });
  }
};

/**
 * Advanced filter for services
 * @route GET /api/v1/search/services/filter
 * @access Authenticated
 */
export const filterServices = async (req: Request, res: Response) => {
  try {
    const {
      status,
      category,
      priority,
      assignedTo,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const user = (req as any).user;
    const filter: any = {};

    // Residents can only see their own services
    if (user.role === "resident") {
      filter.userId = user.id;
    }

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [services, total] = await Promise.all([
      Service.find(filter)
        .populate("userId", "name email")
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Service.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: services,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Filter failed",
      error: error.message,
    });
  }
};
