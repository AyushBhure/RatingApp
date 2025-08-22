import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  changePassword,
  getDashboard,
} from "../controllers/storeOwnerController.js";

const router = express.Router();

router.put("/change-password", authMiddleware(["store_owner"]), changePassword);
router.get("/dashboard", authMiddleware(["store_owner"]), getDashboard);

export default router;
