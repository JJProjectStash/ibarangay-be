import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let isOperational = err.isOperational || false;

  // Mongoose duplicate key error
  if (err.code === 11000 && err.keyValue) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `${field} '${value}' already exists. Please use a different ${field}.`;
    isOperational = true;
  }

  // Mongoose validation error
  if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    isOperational = true;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format provided.";
    isOperational = true;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token.";
    isOperational = true;
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired. Please login again.";
    isOperational = true;
  }

  // Log error details
  const errorLog = {
    message: err.message,
    statusCode,
    isOperational,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
    stack: err.stack,
  };

  if (statusCode >= 500) {
    logger.error("Server Error:", errorLog);
  } else if (process.env.NODE_ENV === "development") {
    logger.warn("Client Error:", errorLog);
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    message,
    statusCode,
  };

  // Include stack trace and additional details in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
    errorResponse.error = err;
    errorResponse.path = req.path;
    errorResponse.method = req.method;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
  });
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
