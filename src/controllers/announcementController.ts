import { Request, Response } from "express";
import Announcement from "../models/Announcement";
import { broadcastToAll } from "../websocket/websocketServer";

/**
 * Announcement Controller
 * Handles CRUD operations for announcements
 */

/**
 * Get all announcements with pagination and filtering
 * @route GET /api/v1/announcements
 * @access Public (published only), Admin/Staff (all)
 */
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { category, priority, search } = req.query;
    const user = (req as any).user;

    // Build filter
    const filter: any = {};

    // Non-admin users can only see published announcements
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      filter.isPublished = true;
    }

    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email"),
      Announcement.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: announcements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
      error: error.message,
    });
  }
};

/**
 * Get single announcement by ID
 * @route GET /api/v1/announcements/:id
 * @access Public (if published), Admin/Staff (all)
 */
export const getAnnouncementById = async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    const user = (req as any).user;
    if (
      !announcement.isPublished &&
      (!user || (user.role !== "admin" && user.role !== "staff"))
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Increment view count
    announcement.views += 1;
    await announcement.save();

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcement",
      error: error.message,
    });
  }
};

/**
 * Create new announcement
 * @route POST /api/v1/announcements
 * @access Admin, Staff
 */
export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const announcementData = {
      ...req.body,
      createdBy: user.id,
    };

    const announcement = await Announcement.create(announcementData);
    await announcement.populate("createdBy", "name email");

    // Broadcast to all connected clients if published
    if (announcement.isPublished) {
      broadcastToAll({
        type: "NEW_ANNOUNCEMENT",
        data: announcement,
      });
    }

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create announcement",
      error: error.message,
    });
  }
};

/**
 * Update announcement
 * @route PUT /api/v1/announcements/:id
 * @access Admin, Staff
 */
export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    ).populate("createdBy", "name email");

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Broadcast update if published
    if (announcement.isPublished) {
      broadcastToAll({
        type: "ANNOUNCEMENT_UPDATED",
        data: announcement,
      });
    }

    res.json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update announcement",
      error: error.message,
    });
  }
};

/**
 * Delete announcement
 * @route DELETE /api/v1/announcements/:id
 * @access Admin
 */
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Broadcast deletion
    broadcastToAll({
      type: "ANNOUNCEMENT_DELETED",
      data: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
      error: error.message,
    });
  }
};

/**
 * Publish/Unpublish announcement
 * @route PATCH /api/v1/announcements/:id/publish
 * @access Admin, Staff
 */
export const togglePublishAnnouncement = async (
  req: Request,
  res: Response,
) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.isPublished = !announcement.isPublished;
    await announcement.save();
    await announcement.populate("createdBy", "name email");

    // Broadcast status change
    broadcastToAll({
      type: announcement.isPublished
        ? "ANNOUNCEMENT_PUBLISHED"
        : "ANNOUNCEMENT_UNPUBLISHED",
      data: announcement,
    });

    res.json({
      success: true,
      message: `Announcement ${announcement.isPublished ? "published" : "unpublished"} successfully`,
      data: announcement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle announcement status",
      error: error.message,
    });
  }
};

/**
 * Pin/Unpin announcement
 * @route PATCH /api/v1/announcements/:id/pin
 * @access Admin, Staff
 */
export const togglePinAnnouncement = async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();
    await announcement.populate("createdBy", "name email");

    res.json({
      success: true,
      message: `Announcement ${announcement.isPinned ? "pinned" : "unpinned"} successfully`,
      data: announcement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle pin status",
      error: error.message,
    });
  }
};
