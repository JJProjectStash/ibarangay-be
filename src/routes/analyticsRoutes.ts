import { Router } from "express";
import {
  getTimeSeriesData,
  getStaffPerformance,
  getCategoryAnalytics,
  getResponseTimeAnalytics,
  getTrendAnalysis,
  getMonthlyReport,
} from "../controllers/analyticsController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// All analytics routes require admin or staff role
router.get(
  "/time-series",
  authenticate,
  authorize("admin", "staff"),
  getTimeSeriesData,
);

router.get(
  "/staff-performance",
  authenticate,
  authorize("admin", "staff"),
  getStaffPerformance,
);

router.get(
  "/category",
  authenticate,
  authorize("admin", "staff"),
  getCategoryAnalytics,
);

router.get(
  "/response-time",
  authenticate,
  authorize("admin", "staff"),
  getResponseTimeAnalytics,
);

router.get(
  "/trends",
  authenticate,
  authorize("admin", "staff"),
  getTrendAnalysis,
);

router.get(
  "/monthly-report",
  authenticate,
  authorize("admin", "staff"),
  getMonthlyReport,
);

export default router;
