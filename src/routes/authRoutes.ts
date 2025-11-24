import { Router } from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  getAllUsers,
  updateUserRole,
  verifyUser,
  deleteUser,
  createStaffAdmin,
  getCsrfToken,
} from "../controllers/authController";
import { authenticate, authorize } from "../middleware/auth";
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  idValidation,
  queryValidation,
} from "../middleware/validation";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

// Public routes
router.get("/csrf-token", getCsrfToken);
router.post("/register", authLimiter, registerValidation, register);
router.post("/login", authLimiter, loginValidation, login);
router.post("/refresh-token", refreshToken);

// Protected routes (authenticated users)
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfileValidation, updateProfile);
router.put(
  "/change-password",
  authenticate,
  changePasswordValidation,
  changePassword,
);

// Admin only routes
router.get(
  "/users",
  authenticate,
  authorize("admin"),
  queryValidation,
  getAllUsers,
);
router.post(
  "/users/staff-admin",
  authenticate,
  authorize("admin"),
  registerValidation,
  createStaffAdmin,
);
router.put(
  "/users/:id/role",
  authenticate,
  authorize("admin"),
  idValidation,
  updateUserRole,
);
router.patch(
  "/users/:id/verify",
  authenticate,
  authorize("admin"),
  idValidation,
  verifyUser,
);
router.delete(
  "/users/:id",
  authenticate,
  authorize("admin"),
  idValidation,
  deleteUser,
);

export default router;
