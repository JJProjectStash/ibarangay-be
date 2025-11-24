import { Router } from "express";
import {
  uploadComplaintAttachment,
  deleteComplaintAttachment,
  uploadEventImage,
} from "../controllers/uploadController";
import { authenticate, authorize } from "../middleware/auth";
import { upload, optimizeImage } from "../middleware/upload";

const router = Router();

// Complaint attachment routes
router.post(
  "/complaints/:id/attachments",
  authenticate,
  upload.single("file"),
  optimizeImage,
  uploadComplaintAttachment,
);

router.delete(
  "/complaints/:id/attachments/:fileUrl",
  authenticate,
  deleteComplaintAttachment,
);

// Event image routes
router.post(
  "/events/:id/image",
  authenticate,
  authorize("admin", "staff"),
  upload.single("image"),
  optimizeImage,
  uploadEventImage,
);

export default router;
