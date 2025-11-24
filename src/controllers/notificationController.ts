import { Response } from "express";
import Notification from "../models/Notification";
import { AuthRequest } from "../types";

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { isRead } = req.query;
    const query: any = { userId: req.user?.id };

    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user?.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch notifications",
    });
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user?.id,
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark notification as read",
    });
  }
};

export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    await Notification.updateMany(
      { userId: req.user?.id, isRead: false },
      { isRead: true },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark all notifications as read",
    });
  }
};

export const deleteNotification = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user?.id,
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete notification",
    });
  }
};
