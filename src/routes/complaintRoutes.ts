import { Router } from "express";
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  addComment,
  rateComplaint,
  escalateComplaint,
  deleteComplaint,
  getComplaintStats,
} from "../controllers/complaintController";
import { authenticate, authorize } from "../middleware/auth";
import { complaintValidation, idValidation } from "../middleware/validation";
import { validateComplaintCategory } from "../middleware/dynamicValidation";

const router = Router();

// Public routes (authenticated)
router.post(
  "/",
  authenticate,
  complaintValidation,
  validateComplaintCategory,
  createComplaint,
);
router.get("/", authenticate, getComplaints);
router.get(
  "/stats",
  authenticate,
  authorize("admin", "staff"),
  getComplaintStats,
);
router.get("/:id", authenticate, idValidation, getComplaintById);

// Comment routes
router.post("/:id/comments", authenticate, idValidation, addComment);

// Rating routes (residents only)
router.post("/:id/rate", authenticate, idValidation, rateComplaint);

// Staff/Admin routes
router.put(
  "/:id/status",
  authenticate,
  authorize("admin", "staff"),
  idValidation,
  updateComplaintStatus,
);

router.put(
  "/:id/assign",
  authenticate,
  authorize("admin", "staff"),
  idValidation,
  assignComplaint,
);

router.post(
  "/:id/escalate",
  authenticate,
  authorize("admin", "staff"),
  idValidation,
  escalateComplaint,
);

router.delete("/:id", authenticate, idValidation, deleteComplaint);

export default router;
