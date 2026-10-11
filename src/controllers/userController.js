const pool = require("../config/database");
const bcrypt = require("bcryptjs");

const createUser = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    const businessId = req.user.businessId;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        message: "full_name, email, and password are required",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    if (
      typeof full_name !== "string" ||
      typeof email !== "string" ||
      !full_name.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: "A valid full name and email are required",
      });
    }

    const businessResult = await pool.query(
      `SELECT id
       FROM businesses
       WHERE id = $1`,
      [businessId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(403).json({
        message: "Your account is not associated with a valid business",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
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
       VALUES ($1, $2, $3, $4, 'staff')
       RETURNING id, business_id, full_name, email, role, created_at`,
      [
        businessId,
        full_name.trim(),
        normalizedEmail,
        passwordHash,
      ]
    );

    return res.status(201).json({
      message: "Staff user created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating user:", error.message);

    return res.status(500).json({
      message: "Failed to create user",
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const result = await pool.query(
      `SELECT id, full_name, email, role, created_at
       FROM users
       WHERE business_id = $1
         AND role = 'staff'
       ORDER BY id DESC`,
      [businessId]
    );

    return res.status(200).json({ users: result.rows });
  } catch (error) {
    console.error("Error listing users:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve staff accounts",
    });
  }
};

module.exports = {
  createUser,
  getUsers,
};
