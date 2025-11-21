/**
 * MongoDB Database Initialization Script
 * This script can be run directly with MongoDB shell or mongosh
 *
 * Usage:
 * mongosh mongodb://localhost:27017/barangay_services init-db.js
 * OR
 * mongo mongodb://localhost:27017/barangay_services < init-db.js
 */

// Switch to the database
db = db.getSiblingDB("barangay_services");

print("🚀 Starting database initialization...");

// Drop existing collections (optional - comment out if you want to preserve data)
print("🗑️  Dropping existing collections...");
db.users.drop();
db.complaints.drop();
db.events.drop();
db.services.drop();
db.notifications.drop();

// Create collections with validation
print("📦 Creating collections with validation...");

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "firstName",
        "lastName",
        "email",
        "password",
        "address",
        "phoneNumber",
      ],
      properties: {
        firstName: { bsonType: "string" },
        lastName: { bsonType: "string" },
        email: { bsonType: "string", pattern: "^\\S+@\\S+\\.\\S+$" },
        password: { bsonType: "string" },
        role: { enum: ["admin", "staff", "resident"] },
        address: { bsonType: "string" },
        phoneNumber: { bsonType: "string" },
        isVerified: { bsonType: "bool" },
      },
    },
  },
});

db.createCollection("complaints", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "title", "description", "category"],
      properties: {
        userId: { bsonType: "objectId" },
        title: { bsonType: "string" },
        description: { bsonType: "string" },
        category: { bsonType: "string" },
        status: { enum: ["pending", "in-progress", "resolved", "closed"] },
        priority: { enum: ["low", "medium", "high"] },
      },
    },
  },
});

db.createCollection("events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "title",
        "description",
        "eventDate",
        "location",
        "organizer",
        "category",
      ],
      properties: {
        title: { bsonType: "string" },
        description: { bsonType: "string" },
        eventDate: { bsonType: "date" },
        location: { bsonType: "string" },
        organizer: { bsonType: "objectId" },
        category: { bsonType: "string" },
        status: { enum: ["upcoming", "ongoing", "completed", "cancelled"] },
      },
    },
  },
});

db.createCollection("services", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "userId",
        "itemName",
        "itemType",
        "borrowDate",
        "expectedReturnDate",
        "purpose",
        "quantity",
      ],
      properties: {
        userId: { bsonType: "objectId" },
        itemName: { bsonType: "string" },
        itemType: { bsonType: "string" },
        borrowDate: { bsonType: "date" },
        expectedReturnDate: { bsonType: "date" },
        status: {
          enum: ["pending", "approved", "borrowed", "returned", "rejected"],
        },
        quantity: { bsonType: "int", minimum: 1 },
      },
    },
  },
});

db.createCollection("notifications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "title", "message"],
      properties: {
        userId: { bsonType: "objectId" },
        title: { bsonType: "string" },
        message: { bsonType: "string" },
        type: { enum: ["info", "warning", "success", "error"] },
        isRead: { bsonType: "bool" },
        relatedType: { enum: ["service", "complaint", "event"] },
      },
    },
  },
});

// Create indexes for better query performance
print("📊 Creating indexes...");

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// Complaints indexes
db.complaints.createIndex({ userId: 1, status: 1 });
db.complaints.createIndex({ status: 1, priority: 1 });
db.complaints.createIndex({ createdAt: -1 });

// Events indexes
db.events.createIndex({ eventDate: 1, status: 1 });
db.events.createIndex({ status: 1 });
db.events.createIndex({ category: 1 });

// Services indexes
db.services.createIndex({ userId: 1, status: 1 });
db.services.createIndex({ borrowDate: -1 });
db.services.createIndex({ status: 1 });

// Notifications indexes
db.notifications.createIndex({ userId: 1, isRead: 1 });
db.notifications.createIndex({ createdAt: -1 });

print("✅ Database initialization completed successfully!");
print(
  "📋 Collections created: users, complaints, events, services, notifications"
);
print("🔍 Indexes created for optimal query performance");
print("");
print("Next steps:");
print("1. Run the seed script to populate sample data: npm run seed");
print("2. Or start your application: npm run dev");
