import { Router } from "express";
import {
  getDashboardStats,
  getUserDashboard,
} from "../controllers/dashboardController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get(
  "/stats",
  authenticate,
  authorize("admin", "staff"),
  getDashboardStats
);
router.get("/user", authenticate, getUserDashboard);

export default router;
