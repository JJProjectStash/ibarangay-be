import { Router } from "express";
import {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
  updateServiceStatus,
  deleteServiceRequest,
  approveServiceRequest,
  rejectServiceRequest,
} from "../controllers/serviceController";
import { authenticate, authorize } from "../middleware/auth";
import {
  serviceRequestValidation,
  idValidation,
} from "../middleware/validation";
import { validateServiceItemType } from "../middleware/dynamicValidation";

const router = Router();

router.post(
  "/",
  authenticate,
  serviceRequestValidation,
  validateServiceItemType,
  createServiceRequest,
);
router.get("/", authenticate, getServiceRequests);
router.get("/:id", authenticate, idValidation, getServiceRequestById);
router.put(
  "/:id/status",
  authenticate,
  authorize("admin", "staff"),
  idValidation,
  updateServiceStatus,
);
router.put(
  "/:id/approve",
  authenticate,
  authorize("admin", "staff"),
  idValidation,
  approveServiceRequest,
);
router.put(
  "/:id/reject",
  authenticate,
  authorize("admin", "staff"),
  idValidation,
  rejectServiceRequest,
);
router.delete("/:id", authenticate, idValidation, deleteServiceRequest);

export default router;
