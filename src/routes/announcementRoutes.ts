import express from "express";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePublishAnnouncement,
  togglePinAnnouncement,
} from "../controllers/announcementController";
import { authenticate, authorize } from "../middleware/security";

const router = express.Router();

// Public routes (published announcements only)
router.get("/", getAnnouncements);
router.get("/:id", getAnnouncementById);

// Protected routes - Admin and Staff only
router.post(
  "/",
  authenticate,
  authorize(["admin", "staff"]),
  createAnnouncement,
);
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "staff"]),
  updateAnnouncement,
);
router.delete("/:id", authenticate, authorize(["admin"]), deleteAnnouncement);
router.patch(
  "/:id/publish",
  authenticate,
  authorize(["admin", "staff"]),
  togglePublishAnnouncement,
);
router.patch(
  "/:id/pin",
  authenticate,
  authorize(["admin", "staff"]),
  togglePinAnnouncement,
);

export default router;
