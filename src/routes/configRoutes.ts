import { Router } from "express";
import {
  getComplaintCategories,
  getServiceItemTypes,
  updateComplaintCategories,
  updateServiceItemTypes,
} from "../controllers/configController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public routes (authenticated users can view)
router.get("/complaint-categories", authenticate, getComplaintCategories);
router.get("/service-item-types", authenticate, getServiceItemTypes);

// Admin/Staff only routes (can edit)
router.put(
  "/complaint-categories",
  authenticate,
  authorize("admin", "staff"),
  updateComplaintCategories,
);
router.put(
  "/service-item-types",
  authenticate,
  authorize("admin", "staff"),
  updateServiceItemTypes,
);

export default router;
