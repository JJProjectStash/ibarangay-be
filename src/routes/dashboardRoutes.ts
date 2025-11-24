import express from "express";
import {
  getDashboardStats,
  getRecentActivities,
  getTimeSeriesData,
  getCategoryDistribution,
  getStaffPerformance,
} from "../controllers/dashboardController";
import { authenticate, authorize } from "../middleware/security";

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

// Dashboard statistics - Admin and Staff only
router.get("/stats", authorize(["admin", "staff"]), getDashboardStats);

// Recent activities - Admin and Staff only
router.get("/activities", authorize(["admin", "staff"]), getRecentActivities);

// Time-series data for charts - Admin and Staff only
router.get("/time-series", authorize(["admin", "staff"]), getTimeSeriesData);

// Category distribution - Admin and Staff only
router.get(
  "/category-distribution",
  authorize(["admin", "staff"]),
  getCategoryDistribution,
);

// Staff performance - Admin only
router.get("/staff-performance", authorize(["admin"]), getStaffPerformance);

export default router;
