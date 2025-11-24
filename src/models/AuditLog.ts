import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  action: string;
  targetType: "user" | "service" | "complaint" | "event" | "system";
  targetId?: mongoose.Types.ObjectId;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    userName: {
      type: String,
      required: [true, "User name is required"],
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      index: true,
    },
    targetType: {
      type: String,
      enum: {
        values: ["user", "service", "complaint", "event", "system"],
        message: "{VALUE} is not a valid target type",
      },
      required: [true, "Target type is required"],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for faster queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

// TTL index to automatically delete old logs after 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
