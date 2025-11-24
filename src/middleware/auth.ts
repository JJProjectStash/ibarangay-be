import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, JWTPayload } from "../types";
import { UnauthorizedError, ForbiddenError } from "../utils/AppError";
import User from "../models/User";

/**
 * Authentication middleware - Verifies JWT token and attaches user info to request
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access denied. No token provided.");
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedError("Access denied. Invalid token format.");
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Verify user still exists and is active
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      throw new UnauthorizedError("User no longer exists.");
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid token."));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError("Token has expired. Please login again."));
    } else {
      next(error);
    }
  }
};

/**
 * Authorization middleware - Checks if user has required role(s)
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required.");
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role(s): ${roles.join(", ")}`,
      );
    }

    next();
  };
};

/**
 * Optional authentication - Attaches user if token is valid, but doesn't fail if missing
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const jwtSecret = process.env.JWT_SECRET;

      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        req.user = {
          id: decoded.id,
          role: decoded.role,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Verify user owns the resource
 */
export const verifyOwnership = (resourceUserIdField: string = "userId") => {
  return async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required.");
      }

      // Admins and staff can access all resources
      if (req.user.role === "admin" || req.user.role === "staff") {
        return next();
      }

      // Check if the resource belongs to the user
      const resourceUserId =
        req.body[resourceUserIdField] || req.params[resourceUserIdField];

      if (resourceUserId && resourceUserId !== req.user.id) {
        throw new ForbiddenError(
          "You do not have permission to access this resource.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
