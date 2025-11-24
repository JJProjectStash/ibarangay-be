import { Response } from "express";
import SystemConfig from "../models/SystemConfig";
import { AuthRequest } from "../types";

export const getComplaintCategories = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const config = await SystemConfig.findOne({ key: "complaint_categories" });

    if (!config) {
      res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: config.value,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch complaint categories",
    });
  }
};

export const getServiceItemTypes = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const config = await SystemConfig.findOne({ key: "service_item_types" });

    if (!config) {
      res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: config.value,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch service item types",
    });
  }
};

export const updateComplaintCategories = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      res.status(400).json({
        success: false,
        message: "Categories must be a non-empty array",
      });
      return;
    }

    // Validate that all categories are strings
    if (!categories.every((cat) => typeof cat === "string" && cat.trim())) {
      res.status(400).json({
        success: false,
        message: "All categories must be non-empty strings",
      });
      return;
    }

    const config = await SystemConfig.findOneAndUpdate(
      { key: "complaint_categories" },
      {
        value: categories.map((cat) => cat.trim().toLowerCase()),
        updatedBy: req.user?.id,
      },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Complaint categories updated successfully",
      data: config.value,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update complaint categories",
    });
  }
};

export const updateServiceItemTypes = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { itemTypes } = req.body;

    if (!Array.isArray(itemTypes) || itemTypes.length === 0) {
      res.status(400).json({
        success: false,
        message: "Item types must be a non-empty array",
      });
      return;
    }

    // Validate that all item types are strings
    if (!itemTypes.every((type) => typeof type === "string" && type.trim())) {
      res.status(400).json({
        success: false,
        message: "All item types must be non-empty strings",
      });
      return;
    }

    const config = await SystemConfig.findOneAndUpdate(
      { key: "service_item_types" },
      {
        value: itemTypes.map((type) => type.trim().toLowerCase()),
        updatedBy: req.user?.id,
      },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Service item types updated successfully",
      data: config.value,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update service item types",
    });
  }
};
