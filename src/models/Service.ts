import mongoose, { Schema } from "mongoose";
import { IService } from "../types";

const serviceSchema = new Schema<IService>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    itemType: {
      type: String,
      required: [true, "Item type is required"],
      trim: true,
    },
    borrowDate: {
      type: Date,
      required: [true, "Borrow date is required"],
    },
    returnDate: {
      type: Date,
    },
    expectedReturnDate: {
      type: Date,
      required: [true, "Expected return date is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "borrowed", "returned", "rejected"],
      default: "pending",
    },
    purpose: {
      type: String,
      required: [true, "Purpose is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 1,
    },
    notes: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
serviceSchema.index({ userId: 1, status: 1 });
serviceSchema.index({ borrowDate: -1 });
serviceSchema.index({ status: 1 });

export default mongoose.model<IService>("Service", serviceSchema);
