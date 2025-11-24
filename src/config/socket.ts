import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWTPayload } from "../types";

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
}

let io: Server;

export const initializeSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for Socket.IO
  io.use((socket: Socket, next: (err?: Error) => void) => {
    try {
      const authSocket = socket as AuthSocket;
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const jwtSecret = process.env.JWT_SECRET || "default_secret";
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      authSocket.userId = decoded.id;
      authSocket.userRole = decoded.role;

      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthSocket;
    console.log(
      `✅ User connected: ${authSocket.userId} (${authSocket.userRole})`,
    );

    // Join user-specific room
    if (authSocket.userId) {
      socket.join(`user:${authSocket.userId}`);
    }

    // Join role-specific rooms
    if (authSocket.userRole === "admin" || authSocket.userRole === "staff") {
      socket.join("staff-room");
    }

    // Handle complaint updates subscription
    socket.on("subscribe:complaint", (complaintId: string) => {
      socket.join(`complaint:${complaintId}`);
      console.log(
        `User ${authSocket.userId} subscribed to complaint ${complaintId}`,
      );
    });

    socket.on("unsubscribe:complaint", (complaintId: string) => {
      socket.leave(`complaint:${complaintId}`);
      console.log(
        `User ${authSocket.userId} unsubscribed from complaint ${complaintId}`,
      );
    });

    // Handle typing indicators
    socket.on("typing:start", (data: { complaintId: string }) => {
      socket.to(`complaint:${data.complaintId}`).emit("user:typing", {
        userId: authSocket.userId,
        complaintId: data.complaintId,
      });
    });

    socket.on("typing:stop", (data: { complaintId: string }) => {
      socket.to(`complaint:${data.complaintId}`).emit("user:stopped-typing", {
        userId: authSocket.userId,
        complaintId: data.complaintId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${authSocket.userId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Helper functions to emit events
export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToStaff = (event: string, data: any) => {
  if (io) {
    io.to("staff-room").emit(event, data);
  }
};

export const emitToComplaint = (
  complaintId: string,
  event: string,
  data: any,
) => {
  if (io) {
    io.to(`complaint:${complaintId}`).emit(event, data);
  }
};

export const emitToAll = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};
