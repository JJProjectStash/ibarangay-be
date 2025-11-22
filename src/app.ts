import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";

// Import routes
import authRoutes from "./routes/authRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import eventRoutes from "./routes/eventRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import bulkRoutes from "./routes/bulkRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import announcementRoutes from "./routes/announcementRoutes";
import adminRoutes from "./routes/adminRoutes";

const app: Application = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:5173",
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/exports", express.static(path.join(process.cwd(), "exports")));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Trust proxy (important for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Rate limiting
app.use("/api", apiLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
  });
});

// API version
app.get("/api", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "iBarangay API",
    version: process.env.API_VERSION || "v1",
    documentation: "/api/v1/docs",
  });
});

// API Routes
const apiVersion = process.env.API_VERSION || "v1";
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/services`, serviceRoutes);
app.use(`/api/${apiVersion}/complaints`, complaintRoutes);
app.use(`/api/${apiVersion}/events`, eventRoutes);
app.use(`/api/${apiVersion}/notifications`, notificationRoutes);
app.use(`/api/${apiVersion}/dashboard`, dashboardRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes);
app.use(`/api/${apiVersion}/bulk`, bulkRoutes);
app.use(`/api/${apiVersion}/analytics`, analyticsRoutes);
app.use(`/api/${apiVersion}/announcements`, announcementRoutes);
app.use(`/api/${apiVersion}/admin`, adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
