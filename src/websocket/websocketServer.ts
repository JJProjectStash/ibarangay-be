import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer;

/**
 * Initialize WebSocket server
 * @param server HTTP server instance
 */
export const initializeWebSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join user-specific room
    socket.on("join", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join role-specific rooms
    socket.on("join-role", (role: string) => {
      socket.join(`role:${role}`);
      console.log(`Socket ${socket.id} joined role:${role}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

/**
 * Get the WebSocket server instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("WebSocket server not initialized");
  }
  return io;
};

/**
 * Emit event to specific user
 * @param userId User ID
 * @param event Event name
 * @param data Event data
 */
export const emitToUser = (userId: string, event: string, data: any): void => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit event to specific role
 * @param role User role
 * @param event Event name
 * @param data Event data
 */
export const emitToRole = (role: string, event: string, data: any): void => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

/**
 * Broadcast event to all connected clients
 * @param data Event data with type
 */
export const broadcastToAll = (data: { type: string; data: any }): void => {
  if (io) {
    io.emit("notification", data);
  }
};

/**
 * Emit notification to user
 * @param userId User ID
 * @param notification Notification data
 */
export const sendNotificationToUser = (
  userId: string,
  notification: any,
): void => {
  emitToUser(userId, "notification", notification);
};

/**
 * Emit notification to role
 * @param role User role
 * @param notification Notification data
 */
export const sendNotificationToRole = (
  role: string,
  notification: any,
): void => {
  emitToRole(role, "notification", notification);
};
