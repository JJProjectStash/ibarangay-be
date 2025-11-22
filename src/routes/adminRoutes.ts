import { Router } from "express";
import {
  getSystemStats,
  getAuditLogs,
  createAuditLog,
  getAuditLogStats,
  deleteOldAuditLogs,
} from "../controllers/adminController";
import { authenticate, authorize } from "../middleware/auth";
import { auditLogMiddleware } from "../middleware/auditLog";

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize("admin"));

// System statistics
router.get("/stats", getSystemStats);

// Audit logs
router.get("/audit-logs", getAuditLogs);
router.post(
  "/audit-logs",
  auditLogMiddleware("manual_log_creation"),
  createAuditLog
);
router.get("/audit-logs/stats", getAuditLogStats);
router.delete(
  "/audit-logs/cleanup",
  auditLogMiddleware("audit_log_cleanup"),
  deleteOldAuditLogs
);

export default router;
