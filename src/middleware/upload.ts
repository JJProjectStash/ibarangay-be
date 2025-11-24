import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import sharp from "sharp";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
const complaintsDir = path.join(uploadDir, "complaints");
const eventsDir = path.join(uploadDir, "events");

[uploadDir, complaintsDir, eventsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb) => {
    const type = req.baseUrl.includes("complaints") ? "complaints" : "events";
    cb(null, path.join(uploadDir, type));
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  // Allowed file types
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, WebP, PDF, and DOC files are allowed.",
      ),
    );
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Image optimization middleware
export const optimizeImage = async (
  req: Request,
  _res: any,
  next: any,
): Promise<void> => {
  if (!req.file || !req.file.mimetype.startsWith("image/")) {
    return next();
  }

  try {
    const filePath = req.file.path;
    const optimizedPath = filePath.replace(
      path.extname(filePath),
      "-optimized" + path.extname(filePath),
    );

    await sharp(filePath)
      .resize(1920, 1080, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .png({ quality: 85 })
      .toFile(optimizedPath);

    // Replace original with optimized
    fs.unlinkSync(filePath);
    fs.renameSync(optimizedPath, filePath);

    next();
  } catch (error) {
    console.error("Image optimization error:", error);
    next(); // Continue even if optimization fails
  }
};

// Delete file helper
export const deleteFile = (filePath: string): void => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
};
