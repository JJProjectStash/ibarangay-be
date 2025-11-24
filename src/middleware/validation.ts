import { body, param, query, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../utils/AppError";

/**
 * Middleware to check validation results
 */
export const validate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((err) => err.msg)
      .join(", ");
    throw new ValidationError(errorMessages);
  }
  next();
};

/**
 * Validation rules for user registration
 */
export const registerValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ min: 10, max: 200 })
    .withMessage("Address must be between 10 and 200 characters"),
  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(\+63|0)?[0-9]{10}$/)
    .withMessage("Please provide a valid Philippine phone number"),
  validate,
];

/**
 * Validation rules for user login
 */
export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

/**
 * Validation rules for profile update
 */
export const updateProfileValidation = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),
  body("address")
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage("Address must be between 10 and 200 characters"),
  body("phoneNumber")
    .optional()
    .trim()
    .matches(/^(\+63|0)?[0-9]{10}$/)
    .withMessage("Please provide a valid Philippine phone number"),
  validate,
];

/**
 * Validation rules for password change
 */
export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
  validate,
];

/**
 * Validation rules for service request (without itemType validation - handled by dynamic middleware)
 */
export const serviceRequestValidation = [
  body("itemName")
    .trim()
    .notEmpty()
    .withMessage("Item name is required")
    .isLength({ max: 100 })
    .withMessage("Item name must not exceed 100 characters"),
  body("itemType").trim().notEmpty().withMessage("Item type is required"),
  body("borrowDate")
    .notEmpty()
    .withMessage("Borrow date is required")
    .isISO8601()
    .withMessage("Invalid borrow date format")
    .custom((value) => {
      const borrowDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (borrowDate < today) {
        throw new Error("Borrow date cannot be in the past");
      }
      return true;
    }),
  body("expectedReturnDate")
    .notEmpty()
    .withMessage("Expected return date is required")
    .isISO8601()
    .withMessage("Invalid return date format")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.borrowDate)) {
        throw new Error("Expected return date must be after borrow date");
      }
      return true;
    }),
  body("purpose")
    .trim()
    .notEmpty()
    .withMessage("Purpose is required")
    .isLength({ min: 10, max: 500 })
    .withMessage("Purpose must be between 10 and 500 characters"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1, max: 100 })
    .withMessage("Quantity must be between 1 and 100"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must not exceed 500 characters"),
  validate,
];

/**
 * Validation rules for service status update
 */
export const serviceStatusValidation = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "approved", "borrowed", "returned", "rejected"])
    .withMessage("Invalid status value"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must not exceed 500 characters"),
  validate,
];

/**
 * Validation rules for complaint (without category validation - handled by dynamic middleware)
 */
export const complaintValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be between 20 and 2000 characters"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),
  validate,
];

/**
 * Validation rules for complaint status update
 */
export const complaintStatusValidation = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "in-progress", "resolved", "closed"])
    .withMessage("Invalid status value"),
  body("response")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Response must not exceed 1000 characters"),
  validate,
];

/**
 * Validation rules for complaint comment
 */
export const commentValidation = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Comment message is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment must be between 1 and 1000 characters"),
  body("isInternal")
    .optional()
    .isBoolean()
    .withMessage("isInternal must be a boolean"),
  validate,
];

/**
 * Validation rules for complaint rating
 */
export const ratingValidation = [
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("feedback")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Feedback must not exceed 500 characters"),
  validate,
];

/**
 * Validation rules for event
 */
export const eventValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be between 20 and 2000 characters"),
  body("eventDate")
    .notEmpty()
    .withMessage("Event date is required")
    .isISO8601()
    .withMessage("Invalid event date format")
    .custom((value) => {
      const eventDate = new Date(value);
      const now = new Date();
      const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      if (eventDate < minDate) {
        throw new Error("Event date must be at least 24 hours in the future");
      }
      return true;
    }),
  body("location")
    .trim()
    .notEmpty()
    .withMessage("Location is required")
    .isLength({ min: 5, max: 200 })
    .withMessage("Location must be between 5 and 200 characters"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isIn(["community", "sports", "cultural", "health", "education", "other"])
    .withMessage("Invalid category"),
  body("maxAttendees")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Max attendees must be between 1 and 10000"),
  body("imageUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
  validate,
];

/**
 * Validation rules for event status update
 */
export const eventStatusValidation = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["upcoming", "ongoing", "completed", "cancelled"])
    .withMessage("Invalid status value"),
  validate,
];

/**
 * Validation rules for MongoDB ObjectId
 */
export const idValidation = [
  param("id").isMongoId().withMessage("Invalid ID format"),
  validate,
];

/**
 * Validation rules for query parameters
 */
export const queryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("sort")
    .optional()
    .isIn(["asc", "desc", "createdAt", "-createdAt", "updatedAt", "-updatedAt"])
    .withMessage("Invalid sort parameter"),
  validate,
];

/**
 * Validation rules for staff assignment
 */
export const assignStaffValidation = [
  body("staffId")
    .notEmpty()
    .withMessage("Staff ID is required")
    .isMongoId()
    .withMessage("Invalid staff ID format"),
  validate,
];

/**
 * Validation for announcement creation
 */
export const announcementValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 20, max: 5000 })
    .withMessage("Content must be between 20 and 5000 characters"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      "general",
      "emergency",
      "event",
      "maintenance",
      "health",
      "security",
    ])
    .withMessage("Invalid category"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority level"),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid expiration date format")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Expiration date must be in the future");
      }
      return true;
    }),
  validate,
];
