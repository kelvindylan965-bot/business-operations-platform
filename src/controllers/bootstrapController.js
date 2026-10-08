const pool = require("../config/database");
const bcrypt = require("bcryptjs");

const bootstrapAdmin = async (req, res) => {
  try {
    const {
      bootstrap_key,
      business_id,
      full_name,
      email,
      password,
    } = req.body;

    if (
      !bootstrap_key ||
      !business_id ||
      !full_name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message:
          "bootstrap_key, business_id, full_name, email, and password are required",
      });
    }

    if (bootstrap_key !== process.env.ADMIN_BOOTSTRAP_KEY) {
      return res.status(403).json({
        message: "Invalid bootstrap key",
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

    const adminResult = await pool.query(
      `SELECT id
       FROM users
       WHERE business_id = $1
       AND role = 'admin'`,
      [business_id]
    );

    if (adminResult.rows.length > 0) {
      return res.status(409).json({
        message: "An admin already exists for this business",
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
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, business_id, full_name, email, role, created_at`,
      [
        business_id,
        full_name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
      ]
    );

    res.status(201).json({
      message: "Admin bootstrapped successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error bootstrapping admin:", error.message);

    res.status(500).json({
      message: "Failed to bootstrap admin",
    });
  }
};

module.exports = {
  bootstrapAdmin,
};
