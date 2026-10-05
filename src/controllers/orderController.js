const pool = require("../config/database");

const getOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, business_id, customer_id, status, total_amount, created_at
       FROM orders
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error.message);

    res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, business_id, customer_id, status, total_amount, created_at
       FROM orders
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching order:", error.message);

    res.status(500).json({
      message: "Failed to fetch order",
    });
  }
};

const createOrder = async (req, res) => {
  try {
    const {
      business_id,
      customer_id,
      status,
      total_amount,
    } = req.body;

    if (!business_id) {
      return res.status(400).json({
        message: "business_id is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO orders
       (business_id, customer_id, status, total_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id, business_id, customer_id, status, total_amount, created_at`,
      [
        business_id,
        customer_id ?? null,
        status ?? "pending",
        total_amount ?? 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating order:", error.message);

    res.status(500).json({
      message: "Failed to create order",
    });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
};
