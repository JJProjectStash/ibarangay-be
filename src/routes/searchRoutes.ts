import express from "express";
import {
  globalSearch,
  filterComplaints,
  filterServices,
} from "../controllers/searchController";
import { authenticate } from "../middleware/security";

const router = express.Router();

// All search routes require authentication
router.use(authenticate);

// Global search
router.get("/global", globalSearch);

// Advanced filters
router.get("/complaints/filter", filterComplaints);
router.get("/services/filter", filterServices);

export default router;
