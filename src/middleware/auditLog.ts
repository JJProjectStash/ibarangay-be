import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import AuditLog from "../models/AuditLog";
import User from "../models/User";

/**
 * Middleware to automatically log admin actions
 */
export const auditLogMiddleware = (action: string) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);

      // Override res.json to log after successful response
      res.json = function (body: any) {
        // Only log if the action was successful
        if (body.success) {
          // Don't await - log asynchronously to avoid blocking response
          logAuditEntry(req, action, body).catch((error) => {
            console.error("Failed to create audit log:", error);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      // Don't block the request if audit logging fails
      console.error("Audit log middleware error:", error);
      next();
    }
  };
};

/**
 * Helper function to create audit log entry
 */
async function logAuditEntry(
  req: AuthRequest,
  action: string,
  responseBody: any
): Promise<void> {
  try {
    if (!req.user?.id) return;

    const user = await User.findById(req.user.id);
    if (!user) return;

    // Determine target type and ID based on the request
    let targetType: "user" | "service" | "complaint" | "event" | "system" =
      "system";
    let targetId: string | undefined;

    // Extract target info from URL path
    if (req.path.includes("/users")) {
      targetType = "user";
      targetId = req.params.id || responseBody.data?.id;
    } else if (req.path.includes("/services")) {
      targetType = "service";
      targetId = req.params.id || responseBody.data?.id;
    } else if (req.path.includes("/complaints")) {
      targetType = "complaint";
      targetId = req.params.id || responseBody.data?.id;
    } else if (req.path.includes("/events")) {
      targetType = "event";
      targetId = req.params.id || responseBody.data?.id;
    }

    // Create audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action,
      targetType,
      targetId: targetId || undefined,
      details: {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        params: req.params,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
  } catch (error) {
    console.error("Failed to log audit entry:", error);
  }
}

/**
 * Specific audit log actions for common admin operations
 */
export const auditActions = {
  USER_ROLE_UPDATED: "user_role_updated",
  USER_VERIFIED: "user_verified",
  USER_DELETED: "user_deleted",
  SERVICE_STATUS_UPDATED: "service_status_updated",
  COMPLAINT_STATUS_UPDATED: "complaint_status_updated",
  COMPLAINT_ASSIGNED: "complaint_assigned",
  EVENT_CREATED: "event_created",
  EVENT_UPDATED: "event_updated",
  EVENT_DELETED: "event_deleted",
  SYSTEM_SETTINGS_UPDATED: "system_settings_updated",
  BULK_OPERATION: "bulk_operation",
  AUDIT_LOG_CLEANUP: "audit_log_cleanup",
};
