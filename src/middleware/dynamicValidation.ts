import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../utils/AppError";
import SystemConfig from "../models/SystemConfig";

/**
 * Dynamic validation for complaint category
 */
export const validateComplaintCategory = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const config = await SystemConfig.findOne({ key: "complaint_categories" });
    const validCategories = config?.value || [
      "infrastructure",
      "sanitation",
      "security",
      "noise",
      "health",
      "other",
    ];

    if (
      !req.body.category ||
      !validCategories.includes(req.body.category.toLowerCase())
    ) {
      throw new ValidationError(
        `Invalid category. Valid categories are: ${validCategories.join(", ")}`,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Dynamic validation for service item type
 */
export const validateServiceItemType = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const config = await SystemConfig.findOne({ key: "service_item_types" });
    const validItemTypes = config?.value || [
      "equipment",
      "facility",
      "document",
      "other",
    ];

    if (
      !req.body.itemType ||
      !validItemTypes.includes(req.body.itemType.toLowerCase())
    ) {
      throw new ValidationError(
        `Invalid item type. Valid item types are: ${validItemTypes.join(", ")}`,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
