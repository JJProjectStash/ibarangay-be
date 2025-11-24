import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemConfig extends Document {
  key: string;
  value: any;
  description?: string;
  isEditable: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

interface ISystemConfigModel extends Model<ISystemConfig> {
  initializeDefaults(): Promise<void>;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Initialize default configurations
systemConfigSchema.statics.initializeDefaults = async function () {
  const defaults = [
    {
      key: "complaint_categories",
      value: [
        "infrastructure",
        "sanitation",
        "security",
        "noise",
        "health",
        "other",
      ],
      description: "Available complaint categories",
      isEditable: true,
    },
    {
      key: "service_item_types",
      value: ["equipment", "facility", "document", "other"],
      description: "Available service item types",
      isEditable: true,
    },
  ];

  for (const config of defaults) {
    await this.findOneAndUpdate(
      { key: config.key },
      { $setOnInsert: config },
      { upsert: true, new: true },
    );
  }
};

export default mongoose.model<ISystemConfig, ISystemConfigModel>(
  "SystemConfig",
  systemConfigSchema,
);
