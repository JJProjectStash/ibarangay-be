import { Request, Response } from "express";
import User from "../models/User";
import Complaint from "../models/Complaint";
import Service from "../models/Service";
import bcrypt from "bcryptjs";

/**
 * Admin Controller
 * Handles administrative operations for user management and system configuration
 */

/**
 * Get all users with pagination and filtering
 * @route GET /api/v1/admin/users
 * @access Admin
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const {
      role,
      status,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Build filter
    const filter: any = {};
    if (role) filter.role = role;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort
    const sort: any = {};
    sort[sortBy as string] = order === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter).select("-password").sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/**
 * Get user by ID with detailed information
 * @route GET /api/v1/admin/users/:id
 * @access Admin
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user statistics
    const [complaintsCount, servicesCount, eventsRegistered] =
      await Promise.all([
        Complaint.countDocuments({ userId: user._id }),
        Service.countDocuments({ userId: user._id }),
        // Assuming Event model has registrations array
        0, // Placeholder
      ]);

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        statistics: {
          complaints: complaintsCount,
          services: servicesCount,
          eventsRegistered,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

/**
 * Create new user
 * @route POST /api/v1/admin/users
 * @access Admin
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: role || "resident",
      phone,
      address,
      isVerified: true, // Admin-created users are auto-verified
      isActive: true,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

/**
 * Update user information
 * @route PUT /api/v1/admin/users/:id
 * @access Admin
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { password, ...updateData } = req.body;

    // If password is being updated, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

/**
 * Delete user
 * @route DELETE /api/v1/admin/users/:id
 * @access Admin
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

/**
 * Toggle user active status
 * @route PATCH /api/v1/admin/users/:id/toggle-status
 * @access Admin
 */
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: userResponse,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle user status",
      error: error.message,
    });
  }
};

/**
 * Verify user account
 * @route PATCH /api/v1/admin/users/:id/verify
 * @access Admin
 */
export const verifyUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User verified successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to verify user",
      error: error.message,
    });
  }
};

/**
 * Assign role to user
 * @route PATCH /api/v1/admin/users/:id/role
 * @access Admin
 */
export const assignRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;

    if (!["resident", "staff", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Role assigned successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to assign role",
      error: error.message,
    });
  }
};

/**
 * Get audit logs
 * @route GET /api/v1/admin/audit-logs
 * @access Admin
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // This is a placeholder - you would need to implement an AuditLog model
    // For now, returning recent activities from various models
    const [complaints, services] = await Promise.all([
      Complaint.find()
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate("userId", "name email")
        .populate("assignedTo", "name email")
        .select("title status category updatedAt"),
      Service.find()
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate("userId", "name email")
        .populate("assignedTo", "name email")
        .select("title status category updatedAt"),
    ]);

    const logs = [
      ...complaints.map((c) => ({
        type: "complaint",
        action: "updated",
        entity: c.title,
        status: c.status,
        user: c.userId,
        assignedTo: c.assignedTo,
        timestamp: c.updatedAt,
      })),
      ...services.map((s) => ({
        type: "service",
        action: "updated",
        entity: s.title,
        status: s.status,
        user: s.userId,
        assignedTo: s.assignedTo,
        timestamp: s.updatedAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(skip, skip + limit);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total: logs.length,
        pages: Math.ceil(logs.length / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};

/**
 * Bulk update users
 * @route POST /api/v1/admin/users/bulk-update
 * @access Admin
 */
export const bulkUpdateUsers = async (req: Request, res: Response) => {
  try {
    const { userIds, updates } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    const result = await User.updateMany({ _id: { $in: userIds } }, updates);

    res.json({
      success: true,
      message: `${result.modifiedCount} users updated successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to bulk update users",
      error: error.message,
    });
  }
};
