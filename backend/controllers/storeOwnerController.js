import pool from "../config/db.js";
import bcrypt from "bcryptjs";

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user_id = req.user.id;

    const userResult = await pool.query("SELECT * FROM users WHERE id=$1", [
      user_id,
    ]);
    const user = userResult.rows[0];

    if (!user || user.role !== "store_owner") {
      return res.status(403).json({ message: "Access denied" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password incorrect" });
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

export const getDashboard = async (req, res) => {
  try {
    const owner_id = req.user.id;

    const storeResult = await pool.query(
      "SELECT * FROM stores WHERE owner_id=$1",
      [owner_id]
    );
    if (storeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No stores found for this owner" });
    }

    const store = storeResult.rows[0];

    const ratingsResult = await pool.query(
      `SELECT u.id AS user_id, u.name AS user_name, r.rating, r.created_at
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.store_id = $1`,
      [store.id]
    );

    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) AS avg_rating FROM ratings WHERE store_id=$1`,
      [store.id]
    );

    const avg_rating = parseFloat(
      avgRatingResult.rows[0].avg_rating || 0
    ).toFixed(2);

    res.json({
      store: { id: store.id, name: store.name, address: store.address },
      average_rating: avg_rating,
      ratings: ratingsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
