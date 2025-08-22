import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
export const JWT_EXPIRES_IN = "1d"; // 1 day
