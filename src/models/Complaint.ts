import mongoose, { Schema } from "mongoose";
import { IComplaint } from "../types";

const complaintCommentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  message: {
    type: String,
    required: true,
  },
  isInternal: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const complaintHistorySchema = new Schema({
  action: {
    type: String,
    required: true,
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  previousStatus: String,
  newStatus: String,
  notes: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const complaintSchema = new Schema<IComplaint>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "closed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    attachments: [
      {
        type: String,
      },
    ],
    response: {
      type: String,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },
    comments: [complaintCommentSchema],
    history: [complaintHistorySchema],
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
    },
    escalationLevel: {
      type: Number,
      default: 0,
    },
    lastEscalatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
complaintSchema.index({ userId: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ category: 1 });

export default mongoose.model<IComplaint>("Complaint", complaintSchema);
