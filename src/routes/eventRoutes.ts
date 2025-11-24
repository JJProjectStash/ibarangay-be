import { Router } from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  getEventAttendees,
  registerForEvent,
  unregisterFromEvent,
  updateEvent,
  deleteEvent,
  exportEventAttendees,
} from "../controllers/eventController";
import { authenticate, authorize } from "../middleware/auth";
import { eventValidation, idValidation } from "../middleware/validation";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("admin", "staff"),
  eventValidation,
  createEvent,
);
router.get("/", authenticate, getEvents);
router.get("/:id", authenticate, idValidation, getEventById);
router.get("/:id/attendees", authenticate, idValidation, getEventAttendees);
router.get(
  "/:id/attendees/export",
  authenticate,
  authorize("admin", "staff"),
  idValidation,
  exportEventAttendees,
);
router.post("/:id/register", authenticate, idValidation, registerForEvent);
router.post("/:id/unregister", authenticate, idValidation, unregisterFromEvent);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "staff"),
  idValidation,
  updateEvent,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  idValidation,
  deleteEvent,
);

export default router;
