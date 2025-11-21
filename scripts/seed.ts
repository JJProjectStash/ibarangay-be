/**
 * Database Seeding Script
 * Populates the database with sample data for testing and development
 *
 * Usage: ts-node scripts/seed.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/barangay_services";

// Sample data
const sampleUsers = [
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@ibarangay.com",
    password: "admin123",
    role: "admin",
    address: "123 Main Street, Barangay Center",
    phoneNumber: "+63 912 345 6789",
    isVerified: true,
  },
  {
    firstName: "Staff",
    lastName: "Member",
    email: "staff@ibarangay.com",
    password: "staff123",
    role: "staff",
    address: "456 Office Road, Barangay Hall",
    phoneNumber: "+63 923 456 7890",
    isVerified: true,
  },
  {
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan@example.com",
    password: "resident123",
    role: "resident",
    address: "789 Residential St, Zone 1",
    phoneNumber: "+63 934 567 8901",
    isVerified: true,
  },
  {
    firstName: "Maria",
    lastName: "Santos",
    email: "maria@example.com",
    password: "resident123",
    role: "resident",
    address: "321 Community Ave, Zone 2",
    phoneNumber: "+63 945 678 9012",
    isVerified: true,
  },
];

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function seedDatabase() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
      console.log("✅ Database cleared");
    } else {
      console.warn(
        "⚠️  mongoose.connection.db is undefined — skipping dropDatabase()."
      );
    }

    // Create Users
    console.log("👥 Creating users...");
    const hashedUsers = await Promise.all(
      sampleUsers.map(async (user) => ({
        ...user,
        password: await hashPassword(user.password),
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );

    const User = mongoose.connection.collection("users");
    const insertedUsers = await User.insertMany(hashedUsers);
    const userIds = Object.values(insertedUsers.insertedIds);
    console.log(`✅ Created ${userIds.length} users`);

    // Create Complaints
    console.log("📝 Creating complaints...");
    const Complaint = mongoose.connection.collection("complaints");
    const complaints = [
      {
        userId: userIds[2], // Juan
        title: "Broken Street Light",
        description:
          "The street light on Main Street has been broken for a week, making the area unsafe at night.",
        category: "Infrastructure",
        status: "pending",
        priority: "high",
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: userIds[3], // Maria
        title: "Garbage Collection Issue",
        description: "Garbage has not been collected in our area for 3 days.",
        category: "Sanitation",
        status: "in-progress",
        priority: "medium",
        attachments: [],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date(),
      },
      {
        userId: userIds[2], // Juan
        title: "Pothole on Road",
        description:
          "Large pothole causing traffic issues and potential accidents.",
        category: "Infrastructure",
        status: "resolved",
        priority: "high",
        response: "Road repair completed on schedule.",
        resolvedBy: userIds[1], // Staff
        resolvedAt: new Date(),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(),
      },
    ];
    await Complaint.insertMany(complaints);
    console.log(`✅ Created ${complaints.length} complaints`);

    // Create Events
    console.log("📅 Creating events...");
    const Event = mongoose.connection.collection("events");
    const events = [
      {
        title: "Community Clean-up Drive",
        description:
          "Join us for a community-wide clean-up initiative to keep our barangay clean and green.",
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        location: "Barangay Plaza",
        organizer: userIds[0], // Admin
        maxAttendees: 50,
        attendees: [userIds[2], userIds[3]],
        category: "Community Service",
        imageUrl: "/images/Cleanup.jpg",
        status: "upcoming",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Health and Wellness Seminar",
        description:
          "Free health check-up and wellness seminar for all residents.",
        eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        location: "Barangay Health Center",
        organizer: userIds[1], // Staff
        maxAttendees: 100,
        attendees: [],
        category: "Health",
        imageUrl: "/images/HealthSeminar.jpg",
        status: "upcoming",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Basketball Tournament",
        description:
          "Annual inter-purok basketball tournament. Register your team now!",
        eventDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        location: "Barangay Basketball Court",
        organizer: userIds[0], // Admin
        maxAttendees: 200,
        attendees: [userIds[2]],
        category: "Sports",
        imageUrl: "/images/Basketball.jpg",
        status: "upcoming",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await Event.insertMany(events);
    console.log(`✅ Created ${events.length} events`);

    // Create Services (Equipment Borrowing)
    console.log("🛠️  Creating service requests...");
    const Service = mongoose.connection.collection("services");
    const services = [
      {
        userId: userIds[2], // Juan
        itemName: "Folding Tables",
        itemType: "Furniture",
        borrowDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        expectedReturnDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: "approved",
        purpose: "Birthday party celebration",
        quantity: 5,
        notes: "Need tables for outdoor setup",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: userIds[3], // Maria
        itemName: "Sound System",
        itemType: "Electronics",
        borrowDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        expectedReturnDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000), // 11 days from now
        status: "pending",
        purpose: "Community meeting",
        quantity: 1,
        notes: "Including microphones and speakers",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: userIds[2], // Juan
        itemName: "Plastic Chairs",
        itemType: "Furniture",
        borrowDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        returnDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        expectedReturnDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: "returned",
        purpose: "Family gathering",
        quantity: 20,
        notes: "All items returned in good condition",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    ];
    await Service.insertMany(services);
    console.log(`✅ Created ${services.length} service requests`);

    // Create Notifications
    console.log("🔔 Creating notifications...");
    const Notification = mongoose.connection.collection("notifications");
    const notifications = [
      {
        userId: userIds[2], // Juan
        title: "Complaint Update",
        message: 'Your complaint "Broken Street Light" is now being processed.',
        type: "info",
        isRead: false,
        relatedType: "complaint",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: userIds[3], // Maria
        title: "Service Request Approved",
        message: "Your borrowing request for Sound System has been approved.",
        type: "success",
        isRead: false,
        relatedType: "service",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: userIds[2], // Juan
        title: "Event Reminder",
        message:
          "Community Clean-up Drive is happening next week. Don't forget to join!",
        type: "info",
        isRead: true,
        relatedType: "event",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(),
      },
      {
        userId: userIds[3], // Maria
        title: "Welcome to iBarangay",
        message:
          "Welcome to the iBarangay platform! Explore our services and stay connected with your community.",
        type: "success",
        isRead: true,
        relatedType: "service",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: new Date(),
      },
    ];
    await Notification.insertMany(notifications);
    console.log(`✅ Created ${notifications.length} notifications`);

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Users: ${userIds.length}`);
    console.log(`   - Complaints: ${complaints.length}`);
    console.log(`   - Events: ${events.length}`);
    console.log(`   - Service Requests: ${services.length}`);
    console.log(`   - Notifications: ${notifications.length}`);
    console.log("\n🔐 Test Credentials:");
    console.log("   Admin: admin@ibarangay.com / admin123");
    console.log("   Staff: staff@ibarangay.com / staff123");
    console.log("   Resident: juan@example.com / resident123");
    console.log("   Resident: maria@example.com / resident123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();
