const pool = require("../config/database");
const bcrypt = require("bcryptjs");

const createUser = async (req, res) => {
  try {
    const { business_id, full_name, email, password, role } = req.body;

    if (!business_id || !full_name || !email || !password || !role) {
      return res.status(400).json({
        message:
          "business_id, full_name, email, password, and role are required",
      });
    }

    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({
        message: "Role must be either admin or staff",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    const businessResult = await pool.query(
      `SELECT id
       FROM businesses
       WHERE id = $1`,
      [business_id]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    const existingUser = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users
       (business_id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, business_id, full_name, email, role, created_at`,
      [
        business_id,
        full_name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        role,
      ]
    );

    res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating user:", error.message);

    res.status(500).json({
      message: "Failed to create user",
    });
  }
};

module.exports = {
  createUser,
};
