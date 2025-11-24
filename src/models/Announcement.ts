import mongoose, { Schema, Document } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  isPublished: boolean;
  isPinned: boolean;
  views: number;
  createdBy: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["general", "emergency", "event", "maintenance", "policy", "other"],
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
AnnouncementSchema.index({ isPublished: 1, isPinned: -1, createdAt: -1 });
AnnouncementSchema.index({ category: 1 });
AnnouncementSchema.index({ title: "text", content: "text" });

// Update publishedAt when isPublished changes to true
AnnouncementSchema.pre("save", function (next) {
  if (this.isModified("isPublished") && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export default mongoose.model<IAnnouncement>(
  "Announcement",
  AnnouncementSchema,
);
