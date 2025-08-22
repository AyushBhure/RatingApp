import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt.js";

export const signup = async (req, res) => {
  try {
    const { name, email, address, password } = req.body;

    const nameValid = typeof name === "string" && name.length >= 20 && name.length <= 60;
    const addressValid = typeof address === "string" && address.length > 0 && address.length <= 400;
    const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
    const passwordValid = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,16}$/.test(password);

    if (!nameValid || !addressValid || !emailValid || !passwordValid) {
      return res.status(400).json({ message: "Validation failed" });
    }

    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name,email,address,password,role)
       VALUES ($1,$2,$3,$4,'user') RETURNING id,name,email,role`,
      [name, email, address, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login (Normal User)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userResult = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getStores = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT s.id, s.name, s.address, 
        COALESCE(AVG(r.rating),0) AS avg_rating,
        MAX(CASE WHEN r.user_id = $1 THEN r.rating END) AS user_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
    `;

    let params = [req.user.id];

    if (search) {
      query += ` WHERE s.name ILIKE $2 OR s.address ILIKE $2`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY s.id`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const rateStore = async (req, res) => {
  try {
    const { store_id, rating } = req.body;
    const user_id = req.user.id;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be 1-5" });
    }

    const existing = await pool.query(
      "SELECT * FROM ratings WHERE user_id=$1 AND store_id=$2",
      [user_id, store_id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE ratings SET rating=$1, updated_at=NOW() WHERE user_id=$2 AND store_id=$3",
        [rating, user_id, store_id]
      );
      return res.json({ message: "Rating updated" });
    }

    await pool.query(
      "INSERT INTO ratings (user_id, store_id, rating) VALUES ($1,$2,$3)",
      [user_id, store_id, rating]
    );

    res.status(201).json({ message: "Rating submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user_id = req.user.id;

    const userResult = await pool.query("SELECT * FROM users WHERE id=$1", [
      user_id,
    ]);
    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    const newPasswordValid = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,16}$/.test(newPassword);
    if (!newPasswordValid) {
      return res.status(400).json({ message: "Password must be 8-16 chars, include uppercase and special char" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password=$1 WHERE id=$2", [
      hashedPassword,
      user_id,
    ]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
