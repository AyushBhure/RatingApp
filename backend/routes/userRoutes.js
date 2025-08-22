import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { signup, login, getStores, rateStore, changePassword } from "../controllers/userController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.get("/stores", authMiddleware(["user"]), getStores);
router.post("/ratings", authMiddleware(["user"]), rateStore);
router.put("/change-password", authMiddleware(["user"]), changePassword);

export default router;
