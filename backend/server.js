import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import storeOwnerRoutes from "./routes/storeOwnerRoutes.js";

import "../backend/config/createProductsTable.js";
import { authMiddleware } from "./middleware/auth.js";

import dotenv from "dotenv";
dotenv.config();


const app = express();

const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use("/api/store-owner", storeOwnerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get(
  "/api/test-protected",
  authMiddleware(["user", "admin", "store_owner"]),
  (req, res) => {
    res.json({ message: "You are authenticated!", user: req.user });
  }
);

app.get("/", (req, res) => {
  res.send("hello from the backend");
});

app.listen(PORT, () => {
  console.log("running on " + PORT);
});
