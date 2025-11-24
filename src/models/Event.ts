import mongoose, { Schema } from "mongoose";
import { IEvent } from "../types";

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    organizer: {
      type: Schema.Types.ObjectId,
      required: [true, "Organizer is required"],
      ref: "User",
    },
    maxAttendees: {
      type: Number,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    imageUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
eventSchema.index({ eventDate: 1, status: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });

export default mongoose.model<IEvent>("Event", eventSchema);
