import { Response } from "express";
import { Types } from "mongoose";
import Event from "../models/Event";
import Notification from "../models/Notification";
import AuditLog from "../models/AuditLog";
import User from "../models/User";
import { AuthRequest } from "../types";

export const createEvent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      title,
      description,
      eventDate,
      location,
      category,
      maxAttendees,
      imageUrl,
    } = req.body;

    const event = await Event.create({
      title,
      description,
      eventDate,
      location,
      organizer: req.user?.id,
      category,
      maxAttendees,
      imageUrl,
      status: "upcoming",
      attendees: [],
    });

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "create",
        targetType: "event",
        targetId: event._id,
        details: { title, eventDate, location },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create event";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const getEvents = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { status, category, search } = req.query;
    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const events = await Event.find(query)
      .populate("organizer", "firstName lastName")
      .populate("attendees", "firstName lastName email phoneNumber")
      .sort({ eventDate: 1 });

    // Add registration count to each event
    const eventsWithCount = events.map((event) => ({
      ...event.toObject(),
      registrationCount: event.attendees.length,
      spotsRemaining: event.maxAttendees
        ? event.maxAttendees - event.attendees.length
        : null,
    }));

    res.status(200).json({
      success: true,
      data: eventsWithCount,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch events";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const getEventById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer", "firstName lastName email")
      .populate("attendees", "firstName lastName email phoneNumber address");

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    const eventData = {
      ...event.toObject(),
      registrationCount: event.attendees.length,
      spotsRemaining: event.maxAttendees
        ? event.maxAttendees - event.attendees.length
        : null,
    };

    res.status(200).json({
      success: true,
      data: eventData,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch event";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const getEventAttendees = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "attendees",
      "firstName lastName email phoneNumber address createdAt",
    );

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    // Format attendee data with registration date
    const attendeesWithDetails = event.attendees.map((attendee: any) => ({
      id: attendee._id,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      fullName: `${attendee.firstName} ${attendee.lastName}`,
      email: attendee.email,
      phoneNumber: attendee.phoneNumber,
      address: attendee.address,
      registeredAt: attendee.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        eventId: event._id,
        eventTitle: event.title,
        totalAttendees: event.attendees.length,
        maxAttendees: event.maxAttendees,
        attendees: attendeesWithDetails,
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch event attendees";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const registerForEvent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    const userId = new Types.ObjectId(req.user?.id);

    // Check if already registered
    if (
      event.attendees.some((attendee: Types.ObjectId) =>
        attendee.equals(userId),
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Already registered for this event",
      });
      return;
    }

    // Check max attendees
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      res.status(400).json({
        success: false,
        message: "Event is full",
      });
      return;
    }

    event.attendees.push(userId);
    await event.save();

    // Create notification
    await Notification.create({
      userId: req.user?.id,
      title: "Event Registration Successful",
      message: `You have successfully registered for "${event.title}".`,
      type: "success",
      relatedId: event._id,
      relatedType: "event",
    });

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "register",
        targetType: "event",
        targetId: event._id,
        details: { eventTitle: event.title },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "Successfully registered for event",
      data: event,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to register for event";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const unregisterFromEvent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    const userId = new Types.ObjectId(req.user?.id);

    // Check if registered
    if (
      !event.attendees.some((attendee: Types.ObjectId) =>
        attendee.equals(userId),
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Not registered for this event",
      });
      return;
    }

    event.attendees = event.attendees.filter(
      (attendeeId: Types.ObjectId) => !attendeeId.equals(userId),
    );
    await event.save();

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "unregister",
        targetType: "event",
        targetId: event._id,
        details: { eventTitle: event.title },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "Successfully unregistered from event",
      data: event,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to unregister from event";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const updateEvent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    // Check if user is organizer or admin/staff
    if (
      event.organizer.toString() !== req.user?.id &&
      req.user?.role !== "admin" &&
      req.user?.role !== "staff"
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to update this event",
      });
      return;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "update",
        targetType: "event",
        targetId: event._id,
        details: { eventTitle: event.title, updates: req.body },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update event";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const deleteEvent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    // Check if user is organizer or admin
    if (
      event.organizer.toString() !== req.user?.id &&
      req.user?.role !== "admin"
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to delete this event",
      });
      return;
    }

    await event.deleteOne();

    // Create audit log
    const user = await User.findById(req.user?.id);
    if (user) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "delete",
        targetType: "event",
        targetId: event._id,
        details: { eventTitle: event.title },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete event";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const exportEventAttendees = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "attendees",
      "firstName lastName email phoneNumber address",
    );

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    // Format data for export
    const exportData = {
      eventTitle: event.title,
      eventDate: event.eventDate,
      location: event.location,
      totalAttendees: event.attendees.length,
      maxAttendees: event.maxAttendees,
      attendees: event.attendees.map((attendee: any) => ({
        name: `${attendee.firstName} ${attendee.lastName}`,
        email: attendee.email,
        phoneNumber: attendee.phoneNumber,
        address: attendee.address,
      })),
    };

    res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to export attendees";
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};
