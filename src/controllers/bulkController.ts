import { Request, Response } from "express";
import Complaint from "../models/Complaint";
import Service from "../models/Service";
import { Parser } from "json2csv";

/**
 * Bulk Operations Controller
 * Handles bulk operations on complaints and services
 */

/**
 * Bulk update complaints status
 * @route POST /api/v1/bulk/complaints/status
 * @access Admin, Staff
 */
export const bulkUpdateComplaintsStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const { complaintIds, status } = req.body;

    if (!Array.isArray(complaintIds) || complaintIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Complaint IDs array is required",
      });
    }

    const result = await Complaint.updateMany(
      { _id: { $in: complaintIds } },
      { status, updatedAt: new Date() },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} complaints updated successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to bulk update complaints",
      error: error.message,
    });
  }
};

/**
 * Bulk assign complaints to staff
 * @route POST /api/v1/bulk/complaints/assign
 * @access Admin, Staff
 */
export const bulkAssignComplaints = async (req: Request, res: Response) => {
  try {
    const { complaintIds, assignedTo } = req.body;

    if (!Array.isArray(complaintIds) || complaintIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Complaint IDs array is required",
      });
    }

    const result = await Complaint.updateMany(
      { _id: { $in: complaintIds } },
      { assignedTo, status: "in-progress", updatedAt: new Date() },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} complaints assigned successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to bulk assign complaints",
      error: error.message,
    });
  }
};

/**
 * Bulk delete complaints
 * @route POST /api/v1/bulk/complaints/delete
 * @access Admin
 */
export const bulkDeleteComplaints = async (req: Request, res: Response) => {
  try {
    const { complaintIds } = req.body;

    if (!Array.isArray(complaintIds) || complaintIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Complaint IDs array is required",
      });
    }

    const result = await Complaint.deleteMany({ _id: { $in: complaintIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} complaints deleted successfully`,
      data: {
        deleted: result.deletedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to bulk delete complaints",
      error: error.message,
    });
  }
};

/**
 * Bulk update services status
 * @route POST /api/v1/bulk/services/status
 * @access Admin, Staff
 */
export const bulkUpdateServicesStatus = async (req: Request, res: Response) => {
  try {
    const { serviceIds, status } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Service IDs array is required",
      });
    }

    const result = await Service.updateMany(
      { _id: { $in: serviceIds } },
      { status, updatedAt: new Date() },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} services updated successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to bulk update services",
      error: error.message,
    });
  }
};

/**
 * Bulk assign services to staff
 * @route POST /api/v1/bulk/services/assign
 * @access Admin, Staff
 */
export const bulkAssignServices = async (req: Request, res: Response) => {
  try {
    const { serviceIds, assignedTo } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Service IDs array is required",
      });
    }

    const result = await Service.updateMany(
      { _id: { $in: serviceIds } },
      { assignedTo, status: "in-progress", updatedAt: new Date() },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} services assigned successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to bulk assign services",
      error: error.message,
    });
  }
};

/**
 * Export complaints to CSV
 * @route GET /api/v1/bulk/complaints/export
 * @access Admin, Staff
 */
export const exportComplaints = async (req: Request, res: Response) => {
  try {
    const { status, category, startDate, endDate } = req.query;

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const complaints = await Complaint.find(filter)
      .populate("userId", "name email")
      .populate("assignedTo", "name email")
      .lean();

    // Transform data for CSV
    const data = complaints.map((c) => ({
      ID: c._id,
      Title: c.title,
      Description: c.description,
      Category: c.category,
      Status: c.status,
      Priority: c.priority || "normal",
      "Submitted By": c.userId?.name || "N/A",
      "Submitted Email": c.userId?.email || "N/A",
      "Assigned To": c.assignedTo?.name || "Unassigned",
      "Created At": new Date(c.createdAt).toLocaleString(),
      "Updated At": new Date(c.updatedAt).toLocaleString(),
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=complaints.csv");
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to export complaints",
      error: error.message,
    });
  }
};

/**
 * Export services to CSV
 * @route GET /api/v1/bulk/services/export
 * @access Admin, Staff
 */
export const exportServices = async (req: Request, res: Response) => {
  try {
    const { status, category, startDate, endDate } = req.query;

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const services = await Service.find(filter)
      .populate("userId", "name email")
      .populate("assignedTo", "name email")
      .lean();

    // Transform data for CSV
    const data = services.map((s) => ({
      ID: s._id,
      Title: s.title,
      Description: s.description,
      Category: s.category,
      Status: s.status,
      Priority: s.priority || "normal",
      "Requested By": s.userId?.name || "N/A",
      "Requested Email": s.userId?.email || "N/A",
      "Assigned To": s.assignedTo?.name || "Unassigned",
      "Created At": new Date(s.createdAt).toLocaleString(),
      "Updated At": new Date(s.updatedAt).toLocaleString(),
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=services.csv");
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to export services",
      error: error.message,
    });
  }
};
