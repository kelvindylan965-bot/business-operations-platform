const pool = require("../config/database");
const bcrypt = require("bcryptjs");

const registerUser = async (req, res) => {
  try {
    const { business_id, full_name, email, password } = req.body;

    if (!business_id || !full_name || !email || !password) {
      return res.status(400).json({
        message: "business_id, full_name, email, and password are required",
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
       VALUES ($1, $2, $3, $4, 'staff')
       RETURNING id, business_id, full_name, email, role, created_at`,
      [
        business_id,
        full_name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
      ]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error registering user:", error.message);

    res.status(500).json({
      message: "Failed to register user",
    });
  }
};

module.exports = {
  registerUser,
};

const jwt = require("jsonwebtoken");

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required",
      });
    }

    const result = await pool.query(
      `SELECT id, business_id, full_name, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        businessId: user.business_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        business_id: user.business_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error.message);

    res.status(500).json({
      message: "Failed to log in user",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
