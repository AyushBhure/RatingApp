import pool from "../config/db.js";

export const addUser = async (req, res) => {
  try {
    const { name, email, password, address, role } = req.body;

    const nameValid = typeof name === "string" && name.length >= 20 && name.length <= 60;
    const addressValid = typeof address === "string" && address.length > 0 && address.length <= 400;
    const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
    const passwordValid = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,16}$/.test(password);

    if (!nameValid || !addressValid || !emailValid || !passwordValid || !role) {
      return res.status(400).json({ message: "Validation failed" });
    }

    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name,email,password,address,role)
       VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role`,
      [name, email, hashedPassword, address, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addStore = async (req, res) => {
  try {
    const { name, email, address, owner_id } = req.body;
    const nameValid = typeof name === "string" && name.length >= 20 && name.length <= 60;
    const addressValid = typeof address === "string" && address.length > 0 && address.length <= 400;
    const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
    if (!nameValid || !addressValid || !emailValid) {
      return res.status(400).json({ message: "Validation failed" });
    }

    if (owner_id) {
      const owner = await pool.query("SELECT id FROM users WHERE id=$1 AND role='store_owner'", [owner_id]);
      if (owner.rows.length === 0) {
        return res.status(400).json({ message: "Owner not found or not a store_owner" });
      }
    }
    const result = await pool.query(
      owner_id
        ? `INSERT INTO stores (name, email, address, owner_id)
           VALUES ($1, $2, $3, $4) RETURNING *`
        : `INSERT INTO stores (name, email, address)
           VALUES ($1, $2, $3) RETURNING *`,
      owner_id
        ? [name, email, address, owner_id]
        : [name, email, address]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const usersCount = await pool.query("SELECT COUNT(*) FROM users");
    const storesCount = await pool.query("SELECT COUNT(*) FROM stores");
    const ratingsCount = await pool.query("SELECT COUNT(*) FROM ratings");

    res.json({
      totalUsers: parseInt(usersCount.rows[0].count),
      totalStores: parseInt(storesCount.rows[0].count),
      totalRatings: parseInt(ratingsCount.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listStores = async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    let query = `
      SELECT s.id, s.name, s.email, s.address, u.name as owner_name,
             COALESCE(AVG(r.rating), 0) as average_rating
      FROM stores s
      LEFT JOIN users u ON s.owner_id = u.id
      LEFT JOIN ratings r ON s.id = r.store_id
    `;

    const conditions = [];
    const params = [];

    if (name) {
      params.push(`%${name}%`);
      conditions.push(`s.name ILIKE $${params.length}`);
    }

    if (email) {
      params.push(`%${email}%`);
      conditions.push(`s.email ILIKE $${params.length}`);
    }

    if (address) {
      params.push(`%${address}%`);
      conditions.push(`s.address ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY s.id, u.name`;

    const validSortFields = [
      "name",
      "email",
      "address",
      "average_rating",
      "owner_name",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "name";
    const order = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
    query += ` ORDER BY ${sortField} ${order}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listUsers = async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      role,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    let query = `
      SELECT u.id, u.name, u.email, u.address, u.role,
             COALESCE(AVG(r.rating), 0) as store_rating
      FROM users u
      LEFT JOIN stores s ON u.id = s.owner_id
      LEFT JOIN ratings r ON s.id = r.store_id
    `;

    const conditions = [];
    const params = [];

    if (name) {
      params.push(`%${name}%`);
      conditions.push(`u.name ILIKE $${params.length}`);
    }

    if (email) {
      params.push(`%${email}%`);
      conditions.push(`u.email ILIKE $${params.length}`);
    }

    if (address) {
      params.push(`%${address}%`);
      conditions.push(`u.address ILIKE $${params.length}`);
    }

    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY u.id`;

    const validSortFields = [
      "name",
      "email",
      "address",
      "role",
      "store_rating",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "name";
    const order = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
    query += ` ORDER BY ${sortField} ${order}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
