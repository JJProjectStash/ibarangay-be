import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import AuditLog from "../models/AuditLog";
import Notification from "../models/Notification";
import { AuthRequest } from "../types";
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../utils/AppError";

const generateToken = (id: string, role: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpire = process.env.JWT_EXPIRE || "7d";

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ id, role }, jwtSecret, {
    expiresIn: jwtExpire,
  } as jwt.SignOptions);
};

const generateRefreshToken = (id: string): string => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const jwtRefreshExpire = process.env.JWT_REFRESH_EXPIRE || "30d";

  if (!jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return jwt.sign({ id }, jwtRefreshSecret, {
    expiresIn: jwtRefreshExpire,
  } as jwt.SignOptions);
};

/**
 * Get CSRF token
 */
export const getCsrfToken = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Generate a random CSRF token
    const csrfToken = crypto.randomBytes(32).toString("hex");
    
    res.status(200).json({
      success: true,
      data: {
        csrfToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate CSRF token",
    });
  }
};

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, address, phoneNumber } =
      req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      address,
      phoneNumber,
      role: "resident",
    });

    // Generate tokens
    const token = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          address: user.address,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Generate tokens
    const token = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          address: user.address,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

/**
 * Get user profile
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        address: user.address,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch profile",
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { firstName, lastName, address, phoneNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { firstName, lastName, address, phoneNumber },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        address: user.address,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

/**
 * Change password
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?.id).select("+password");

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as {
      id: string;
    };

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Generate new access token
    const newToken = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
      },
    });
  } catch (error: any) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    } else {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to refresh token",
      });
    }
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role, isVerified, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (role) {
      query.role = role;
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!["admin", "staff", "resident"].includes(role)) {
      throw new ValidationError("Invalid role");
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Create audit log
    const adminUser = await User.findById(req.user?.id);
    if (adminUser) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${adminUser.firstName} ${adminUser.lastName}`,
        action: "update_role",
        targetType: "user",
        targetId: user._id,
        details: { newRole: role, userEmail: user.email },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user role",
    });
  }
};

/**
 * Verify user account (admin only)
 */
export const verifyUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { isVerified: true },
      { new: true }
    ).select("-password");

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.status(200).json({
      success: true,
      message: "User verified successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to verify user",
    });
  }
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (id === req.user?.id) {
      throw new ValidationError("Cannot delete your own account");
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Create audit log
    const adminUser = await User.findById(req.user?.id);
    if (adminUser) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${adminUser.firstName} ${adminUser.lastName}`,
        action: "delete",
        targetType: "user",
        targetId: user._id,
        details: { userEmail: user.email, userRole: user.role },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete user",
    });
  }
};

/**
 * Create staff or admin account (admin only)
 */
export const createStaffAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { firstName, lastName, email, password, address, phoneNumber, role } =
      req.body;

    // Validate role
    if (!["admin", "staff"].includes(role)) {
      throw new ValidationError("Role must be either admin or staff");
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      address,
      phoneNumber,
      role,
      isVerified: true, // Auto-verify staff/admin accounts
    });

    // Create notification for the new user
    await Notification.create({
      userId: user._id,
      title: "Account Created",
      message: `Your ${role} account has been created. You can now log in to the system.`,
      type: "info",
    });

    // Create audit log
    const adminUser = await User.findById(req.user?.id);
    if (adminUser) {
      await AuditLog.create({
        userId: req.user?.id,
        userName: `${adminUser.firstName} ${adminUser.lastName}`,
        action: "create",
        targetType: "user",
        targetId: user._id,
        details: { userEmail: user.email, userRole: role },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        address: user.address,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create account",
    });
  }
};