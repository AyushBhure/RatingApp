import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  addUser,
  addStore,
  getDashboard,
  listUsers,
  listStores,
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/add-user", authMiddleware(["admin"]), addUser);
router.post("/add-store", authMiddleware(["admin"]), addStore);
router.get("/dashboard", authMiddleware(["admin"]), getDashboard);
router.get("/users", authMiddleware(["admin"]), listUsers);
router.get("/stores", authMiddleware(["admin"]), listStores);

export default router;
