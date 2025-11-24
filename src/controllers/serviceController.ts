import { Response } from "express";
import Service from "../models/Service";
import Notification from "../models/Notification";
import AuditLog from "../models/AuditLog";
import User from "../models/User";
import { AuthRequest } from "../types";

export const createServiceRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      itemName,
      itemType,
      borrowDate,
      expectedReturnDate,
      purpose,
      quantity,
      notes,
    } = req.body;

    const service = await Service.create({
      userId: req.user?.id,
      itemName,
      itemType,
      borrowDate,
      expectedReturnDate,
      purpose,
      quantity,
      notes,
      status: "pending",
    });

    // Create notification
    await Notification.create({
      userId: req.user?.id,
      title: "Service Request Submitted",
      message: `Your request for ${itemName} has been submitted and is pending approval.`,
      type: "info",
      relatedId: service._id,
      relatedType: "service",
    });

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "create",
        targetType: "service",
        targetId: service._id,
        details: { itemName, itemType, quantity },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(201).json({
      success: true,
      message: "Service request created successfully",
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create service request",
    });
  }
};

export const getServiceRequests = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query: any = {};

    // If not admin/staff, only show user's own requests
    if (req.user?.role === "resident") {
      query.userId = req.user.id;
    }

    if (status) {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { itemType: { $regex: search, $options: "i" } },
        { purpose: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const total = await Service.countDocuments(query);
    const services = await Service.find(query)
      .populate("userId", "firstName lastName email phoneNumber address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: services,
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
      message: error.message || "Failed to fetch service requests",
    });
  }
};

export const getServiceRequestById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "userId",
      "firstName lastName email phoneNumber address",
    );

    if (!service) {
      res.status(404).json({
        success: false,
        message: "Service request not found",
      });
      return;
    }

    // Check authorization
    if (
      req.user?.role === "resident" &&
      service.userId.toString() !== req.user.id
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to view this request",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch service request",
    });
  }
};

export const updateServiceStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { status, notes, rejectionReason } = req.body;

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        status,
        notes,
        ...(rejectionReason && { rejectionReason }),
        ...(status === "returned" && { returnDate: new Date() }),
        ...(status === "approved" && {
          approvedBy: req.user?.id,
          approvedAt: new Date(),
        }),
        ...(status === "rejected" && {
          rejectedBy: req.user?.id,
          rejectedAt: new Date(),
        }),
      },
      { new: true, runValidators: true },
    ).populate("userId", "firstName lastName email");

    if (!service) {
      res.status(404).json({
        success: false,
        message: "Service request not found",
      });
      return;
    }

    // Create notification for user
    const notificationMessages: Record<string, string> = {
      approved: "Your service request has been approved.",
      rejected: `Your service request has been rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
      borrowed: "Item has been borrowed successfully.",
      returned: "Item has been returned successfully.",
    };

    await Notification.create({
      userId: service.userId,
      title: "Service Request Update",
      message:
        notificationMessages[status] ||
        "Your service request status has been updated.",
      type: status === "rejected" ? "error" : "success",
      relatedId: service._id,
      relatedType: "service",
    });

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "update_status",
        targetType: "service",
        targetId: service._id,
        details: {
          status,
          itemName: service.itemName,
          rejectionReason: rejectionReason || null,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "Service status updated successfully",
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update service status",
    });
  }
};

export const deleteServiceRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      res.status(404).json({
        success: false,
        message: "Service request not found",
      });
      return;
    }

    // Only allow deletion if pending and user owns it, or if admin/staff
    if (
      req.user?.role === "resident" &&
      (service.status !== "pending" ||
        service.userId.toString() !== req.user?.id)
    ) {
      res.status(403).json({
        success: false,
        message: "Cannot delete this service request",
      });
      return;
    }

    await service.deleteOne();

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "delete",
        targetType: "service",
        targetId: service._id,
        details: { itemName: service.itemName },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "Service request deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete service request",
    });
  }
};

export const approveServiceRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { notes } = req.body;

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        status: "approved",
        notes,
        approvedBy: req.user?.id,
        approvedAt: new Date(),
      },
      { new: true, runValidators: true },
    ).populate("userId", "firstName lastName email");

    if (!service) {
      res.status(404).json({
        success: false,
        message: "Service request not found",
      });
      return;
    }

    // Create notification
    await Notification.create({
      userId: service.userId,
      title: "Service Request Approved",
      message: `Your request for ${service.itemName} has been approved.`,
      type: "success",
      relatedId: service._id,
      relatedType: "service",
    });

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "approve",
        targetType: "service",
        targetId: service._id,
        details: { itemName: service.itemName, notes },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "Service request approved successfully",
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve service request",
    });
  }
};

export const rejectServiceRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { rejectionReason, notes } = req.body;

    if (!rejectionReason) {
      res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
      return;
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        rejectionReason,
        notes,
        rejectedBy: req.user?.id,
        rejectedAt: new Date(),
      },
      { new: true, runValidators: true },
    ).populate("userId", "firstName lastName email");

    if (!service) {
      res.status(404).json({
        success: false,
        message: "Service request not found",
      });
      return;
    }

    // Create notification
    await Notification.create({
      userId: service.userId,
      title: "Service Request Rejected",
      message: `Your request for ${service.itemName} has been rejected. Reason: ${rejectionReason}`,
      type: "error",
      relatedId: service._id,
      relatedType: "service",
    });

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "reject",
        targetType: "service",
        targetId: service._id,
        details: { itemName: service.itemName, rejectionReason },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "Service request rejected successfully",
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject service request",
    });
  }
};
