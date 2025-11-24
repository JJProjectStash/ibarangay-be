import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

/**
 * Connect to MongoDB with retry logic
 */
export const connectDatabase = async (retryCount = 0): Promise<void> => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/barangay_services";

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);

    if (retryCount < MAX_RETRIES) {
      console.log(
        `🔄 Retrying connection... (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      return connectDatabase(retryCount + 1);
    } else {
      console.error("❌ Max retries reached. Exiting...");
      process.exit(1);
    }
  }
};

/**
 * Gracefully disconnect from MongoDB
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB disconnected gracefully");
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error);
  }
};
