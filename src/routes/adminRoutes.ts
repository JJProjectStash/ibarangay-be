import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  verifyUser,
  assignRole,
  getAuditLogs,
  bulkUpdateUsers,
} from "../controllers/adminController";
import { authenticate, authorize } from "../middleware/security";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize(["admin"]));

// User management routes
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id/toggle-status", toggleUserStatus);
router.patch("/users/:id/verify", verifyUser);
router.patch("/users/:id/role", assignRole);
router.post("/users/bulk-update", bulkUpdateUsers);

// Audit logs
router.get("/audit-logs", getAuditLogs);

export default router;
