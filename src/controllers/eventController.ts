import { Response } from "express";
import { Types } from "mongoose";
import Event from "../models/Event";
import Notification from "../models/Notification";
import { AuthRequest } from "../types";

export const createEvent = async (
  req: AuthRequest,
  res: Response
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
  res: Response
): Promise<void> => {
  try {
    const { status, category } = req.query;
    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    const events = await Event.find(query)
      .populate("organizer", "firstName lastName")
      .populate("attendees", "firstName lastName email")
      .sort({ eventDate: 1 });

    res.status(200).json({
      success: true,
      data: events,
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
  res: Response
): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer", "firstName lastName email")
      .populate("attendees", "firstName lastName email");

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: event,
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

export const registerForEvent = async (
  req: AuthRequest,
  res: Response
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
        attendee.equals(userId)
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
  res: Response
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
        attendee.equals(userId)
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Not registered for this event",
      });
      return;
    }

    event.attendees = event.attendees.filter(
      (attendeeId: Types.ObjectId) => !attendeeId.equals(userId)
    );
    await event.save();

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
  res: Response
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
      { new: true, runValidators: true }
    );

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
  res: Response
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
