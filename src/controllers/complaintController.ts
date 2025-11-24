import { Response } from "express";
import Complaint from "../models/Complaint";
import Notification from "../models/Notification";
import User from "../models/User";
import { AuthRequest } from "../types";
import { emitToUser, emitToStaff, emitToComplaint } from "../config/socket";

// Auto-assign complaint to staff based on category
const autoAssignComplaint = async (complaintId: string, category: string) => {
  try {
    // Find available staff members
    const staff = await User.find({ role: "staff", isVerified: true });

    if (staff.length > 0) {
      // Simple round-robin assignment (can be improved with workload balancing)
      const randomStaff = staff[Math.floor(Math.random() * staff.length)];

      await Complaint.findByIdAndUpdate(complaintId, {
        assignedTo: randomStaff._id,
        $push: {
          history: {
            action: "Auto-assigned to staff",
            performedBy: randomStaff._id,
            notes: `Automatically assigned based on category: ${category}`,
            timestamp: new Date(),
          },
        },
      });

      // Notify assigned staff
      await Notification.create({
        userId: randomStaff._id,
        title: "New Complaint Assigned",
        message: `A new complaint has been assigned to you in category: ${category}`,
        type: "info",
        relatedId: complaintId,
        relatedType: "complaint",
      });

      // Real-time notification
      emitToUser(randomStaff._id.toString(), "complaint:assigned", {
        complaintId,
        category,
      });
    }
  } catch (error) {
    console.error("Auto-assignment failed:", error);
  }
};

export const createComplaint = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { title, description, category, priority, attachments } = req.body;

    const complaint = await Complaint.create({
      userId: req.user?.id,
      title,
      description,
      category,
      priority: priority || "medium",
      attachments,
      status: "pending",
      history: [
        {
          action: "Complaint created",
          performedBy: req.user?.id,
          newStatus: "pending",
          timestamp: new Date(),
        },
      ],
    });

    // Auto-assign to staff
    await autoAssignComplaint(complaint._id.toString(), category);

    // Create notification for user
    await Notification.create({
      userId: req.user?.id,
      title: "Complaint Submitted",
      message: `Your complaint "${title}" has been submitted successfully and will be reviewed shortly.`,
      type: "success",
      relatedId: complaint._id,
      relatedType: "complaint",
    });

    // Real-time notification to staff
    emitToStaff("complaint:new", {
      complaintId: complaint._id,
      title,
      category,
      priority,
    });

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      data: complaint,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit complaint",
    });
  }
};

export const getComplaints = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { status, priority, category, assignedTo } = req.query;
    const query: any = {};

    // Role-based filtering
    if (req.user?.role === "resident") {
      query.userId = req.user.id;
    } else if (req.user?.role === "staff" && !assignedTo) {
      // Staff sees assigned complaints by default
      query.assignedTo = req.user.id;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;

    const complaints = await Complaint.find(query)
      .populate("userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName")
      .populate("resolvedBy", "firstName lastName")
      .populate("comments.userId", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: complaints,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch complaints",
    });
  }
};

export const getComplaintById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("userId", "firstName lastName email phoneNumber address")
      .populate("assignedTo", "firstName lastName email")
      .populate("resolvedBy", "firstName lastName")
      .populate("comments.userId", "firstName lastName")
      .populate("history.performedBy", "firstName lastName");

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
      return;
    }

    // Check authorization
    if (
      req.user?.role === "resident" &&
      complaint.userId.toString() !== req.user.id
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to view this complaint",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch complaint",
    });
  }
};

export const updateComplaintStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { status, response } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
      return;
    }

    const previousStatus = complaint.status;
    const updateData: any = { status };

    if (response) {
      updateData.response = response;
    }

    if (status === "resolved" || status === "closed") {
      updateData.resolvedBy = req.user?.id;
      updateData.resolvedAt = new Date();
    }

    // Add to history
    updateData.$push = {
      history: {
        action: "Status updated",
        performedBy: req.user?.id,
        previousStatus,
        newStatus: status,
        notes: response,
        timestamp: new Date(),
      },
    };

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    // Create notification for user
    const notificationMessages: Record<string, string> = {
      "in-progress": "Your complaint is now being processed by our team.",
      resolved: "Your complaint has been resolved. Please provide feedback!",
      closed: "Your complaint has been closed.",
    };

    await Notification.create({
      userId: complaint.userId,
      title: "Complaint Update",
      message:
        notificationMessages[status] ||
        "Your complaint status has been updated.",
      type: status === "resolved" ? "success" : "info",
      relatedId: complaint._id,
      relatedType: "complaint",
    });

    // Real-time notifications
    emitToUser(complaint.userId.toString(), "complaint:status-changed", {
      complaintId: complaint._id,
      status,
      previousStatus,
    });

    emitToComplaint(complaint._id.toString(), "status:updated", {
      status,
      response,
      updatedBy: req.user?.id,
    });

    res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: updatedComplaint,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update complaint",
    });
  }
};

export const assignComplaint = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { staffId } = req.body;

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== "staff") {
      res.status(400).json({
        success: false,
        message: "Invalid staff member",
      });
      return;
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: staffId,
        $push: {
          history: {
            action: "Complaint assigned",
            performedBy: req.user?.id,
            notes: `Assigned to ${staff.firstName} ${staff.lastName}`,
            timestamp: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
      return;
    }

    // Notify assigned staff
    await Notification.create({
      userId: staffId,
      title: "Complaint Assigned",
      message: `You have been assigned a new complaint: ${complaint.title}`,
      type: "info",
      relatedId: complaint._id,
      relatedType: "complaint",
    });

    // Real-time notification
    emitToUser(staffId, "complaint:assigned", {
      complaintId: complaint._id,
      title: complaint.title,
    });

    res.status(200).json({
      success: true,
      message: "Complaint assigned successfully",
      data: complaint,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign complaint",
    });
  }
};

export const addComment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { message, isInternal } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            userId: req.user?.id,
            message,
            isInternal: isInternal || false,
            createdAt: new Date(),
          },
          history: {
            action: "Comment added",
            performedBy: req.user?.id,
            notes: isInternal ? "Internal note added" : "Public comment added",
            timestamp: new Date(),
          },
        },
      },
      { new: true },
    ).populate("comments.userId", "firstName lastName");

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
      return;
    }

    // Notify complaint owner if not internal
    if (!isInternal && complaint.userId.toString() !== req.user?.id) {
      await Notification.create({
        userId: complaint.userId,
        title: "New Comment on Your Complaint",
        message: `A new comment has been added to your complaint: ${complaint.title}`,
        type: "info",
        relatedId: complaint._id,
        relatedType: "complaint",
      });

      // Real-time notification
      emitToUser(complaint.userId.toString(), "complaint:new-comment", {
        complaintId: complaint._id,
        message,
      });
    }

    // Real-time update to complaint subscribers
    emitToComplaint(complaint._id.toString(), "comment:added", {
      comment: {
        userId: req.user?.id,
        message,
        isInternal,
        createdAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Comment added successfully",
      data: complaint,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add comment",
    });
  }
};

export const rateComplaint = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { rating, feedback } = req.body;

    if (rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
      return;
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
      return;
    }

    // Only complaint owner can rate
    if (complaint.userId.toString() !== req.user?.id) {
      res.status(403).json({
        success: false,
        message: "Not authorized to rate this complaint",
      });
      return;
    }

    // Only resolved complaints can be rated
    if (complaint.status !== "resolved") {
      res.status(400).json({
        success: false,
        message: "Only resolved complaints can be rated",
      });
      return;
    }

    complaint.rating = rating;
    complaint.feedback = feedback;
    await complaint.save();

    // Notify assigned staff about the rating
    if (complaint.assignedTo) {
      await Notification.create({
        userId: complaint.assignedTo,
        title: "Complaint Rated",
        message: `Your resolved complaint received a ${rating}-star rating`,
        type: "info",
        relatedId: complaint._id,
        relatedType: "complaint",
      });

      emitToUser(complaint.assignedTo.toString(), "complaint:rated", {
        complaintId: complaint._id,
        rating,
      });
    }

    res.status(200).json({
      success: true,
      message: "Thank you for your feedback!",
      data: complaint,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to rate complaint",
    });
  }
};

export const escalateComplaint = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
      return;
    }

    complaint.escalationLevel += 1;
    complaint.lastEscalatedAt = new Date();
    complaint.priority = "high";

    complaint.history.push({
      action: "Complaint escalated",
      performedBy: req.user?.id as any,
      notes: `Escalation level increased to ${complaint.escalationLevel}`,
      timestamp: new Date(),
    });

    await complaint.save();

    // Notify admins
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: "Complaint Escalated",
        message: `Complaint "${complaint.title}" has been escalated (Level ${complaint.escalationLevel})`,
        type: "warning",
        relatedId: complaint._id,
        relatedType: "complaint",
      });

      // Real-time notification
      emitToUser(admin._id.toString(), "complaint:escalated", {
        complaintId: complaint._id,
        escalationLevel: complaint.escalationLevel,
      });
    }

    res.status(200).json({
      success: true,
      message: "Complaint escalated successfully",
      data: complaint,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to escalate complaint",
    });
  }
};

export const deleteComplaint = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
      return;
    }

    // Only allow deletion if pending and user owns it
    if (
      complaint.status !== "pending" ||
      complaint.userId.toString() !== req.user?.id
    ) {
      res.status(403).json({
        success: false,
        message: "Cannot delete this complaint",
      });
      return;
    }

    await complaint.deleteOne();

    res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete complaint",
    });
  }
};

export const getComplaintStats = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const stats = await Complaint.aggregate([
      {
        $facet: {
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
          byCategory: [
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          averageResolutionTime: [
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
          ],
          averageRating: [
            {
              $match: { rating: { $exists: true } },
            },
            {
              $group: {
                _id: null,
                avgRating: { $avg: "$rating" },
                totalRatings: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch statistics",
    });
  }
};
