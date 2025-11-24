import { Response } from "express";
import { AuthRequest } from "../types";
import Complaint from "../models/Complaint";
import Event from "../models/Event";
import { deleteFile } from "../middleware/upload";

export const uploadComplaintAttachment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
      return;
    }

    const complaintId = req.params.id;
    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      deleteFile(req.file.path);
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
      deleteFile(req.file.path);
      res.status(403).json({
        success: false,
        message: "Not authorized to upload files to this complaint",
      });
      return;
    }

    // Generate file URL
    const fileUrl = `/uploads/complaints/${req.file.filename}`;

    // Add to attachments
    complaint.attachments = complaint.attachments || [];
    complaint.attachments.push(fileUrl);
    await complaint.save();

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error: any) {
    if (req.file) {
      deleteFile(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload file",
    });
  }
};

export const deleteComplaintAttachment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id: complaintId, fileUrl } = req.params;

    const complaint = await Complaint.findById(complaintId);

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
        message: "Not authorized to delete files from this complaint",
      });
      return;
    }

    // Remove from attachments array
    const decodedFileUrl = decodeURIComponent(fileUrl);
    complaint.attachments = complaint.attachments?.filter(
      (url) => url !== decodedFileUrl,
    );
    await complaint.save();

    // Delete physical file
    deleteFile(decodedFileUrl);

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete file",
    });
  }
};

export const uploadEventImage = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
      return;
    }

    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      deleteFile(req.file.path);
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    // Delete old image if exists
    if (event.imageUrl) {
      deleteFile(event.imageUrl);
    }

    // Generate file URL
    const fileUrl = `/uploads/events/${req.file.filename}`;
    event.imageUrl = fileUrl;
    await event.save();

    res.status(200).json({
      success: true,
      message: "Event image uploaded successfully",
      data: {
        fileUrl,
        fileName: req.file.originalname,
      },
    });
  } catch (error: any) {
    if (req.file) {
      deleteFile(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload event image",
    });
  }
};
