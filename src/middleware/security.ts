import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const sanitize = (obj: Record<string, any>): Record<string, any> => {
    const sanitized: Record<string, any> = {};
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        // Remove potentially dangerous characters
        sanitized[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "");
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitized[key] = sanitize(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query as Record<string, any>);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

/**
 * Prevent parameter pollution
 */
export const preventParameterPollution = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // Ensure query parameters are not arrays (except for allowed ones)
  const allowedArrayParams = ["status", "category", "priority"];

  for (const key in req.query) {
    if (Array.isArray(req.query[key]) && !allowedArrayParams.includes(key)) {
      req.query[key] = (req.query[key] as string[])[0];
    }
  }

  next();
};

/**
 * Add security headers
 */
export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  next();
};

/**
 * Request ID middleware for tracing
 */
export const requestId = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
};
