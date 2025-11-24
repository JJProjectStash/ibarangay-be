import express from "express";
import {
  bulkUpdateComplaintsStatus,
  bulkAssignComplaints,
  bulkDeleteComplaints,
  bulkUpdateServicesStatus,
  bulkAssignServices,
  exportComplaints,
  exportServices,
} from "../controllers/bulkController";
import { authenticate, authorize } from "../middleware/security";

const router = express.Router();

// All bulk routes require authentication
router.use(authenticate);

// Bulk complaint operations - Admin and Staff
router.post(
  "/complaints/status",
  authorize(["admin", "staff"]),
  bulkUpdateComplaintsStatus,
);
router.post(
  "/complaints/assign",
  authorize(["admin", "staff"]),
  bulkAssignComplaints,
);
router.post("/complaints/delete", authorize(["admin"]), bulkDeleteComplaints);
router.get(
  "/complaints/export",
  authorize(["admin", "staff"]),
  exportComplaints,
);

// Bulk service operations - Admin and Staff
router.post(
  "/services/status",
  authorize(["admin", "staff"]),
  bulkUpdateServicesStatus,
);
router.post(
  "/services/assign",
  authorize(["admin", "staff"]),
  bulkAssignServices,
);
router.get("/services/export", authorize(["admin", "staff"]), exportServices);

export default router;
