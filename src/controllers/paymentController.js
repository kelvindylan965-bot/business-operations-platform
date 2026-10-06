const pool = require("../config/database");

const getPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, order_id, amount, payment_method, reference, status, paid_at
       FROM payments
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching payments:", error.message);

    res.status(500).json({
      message: "Failed to fetch payments",
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, order_id, amount, payment_method, reference, status, paid_at
       FROM payments
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching payment:", error.message);

    res.status(500).json({
      message: "Failed to fetch payment",
    });
  }
};

const createPayment = async (req, res) => {
  try {
    const {
      order_id,
      amount,
      payment_method,
      reference,
      status,
    } = req.body;

    if (!order_id || amount === undefined || !payment_method) {
      return res.status(400).json({
        message: "order_id, amount and payment_method are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO payments
       (order_id, amount, payment_method, reference, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, order_id, amount, payment_method, reference, status, paid_at`,
      [
        order_id,
        amount,
        payment_method,
        reference ?? null,
        status ?? "completed",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating payment:", error.message);

    res.status(500).json({
      message: "Failed to create payment",
    });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_method,
      reference,
      status,
    } = req.body;

    if (amount === undefined || !payment_method || !status) {
      return res.status(400).json({
        message: "amount, payment_method and status are required",
      });
    }

    const result = await pool.query(
      `UPDATE payments
       SET amount = $1,
           payment_method = $2,
           reference = $3,
           status = $4
       WHERE id = $5
       RETURNING id, order_id, amount, payment_method, reference, status, paid_at`,
      [
        amount,
        payment_method,
        reference ?? null,
        status,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating payment:", error.message);

    res.status(500).json({
      message: "Failed to update payment",
    });
  }
};

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM payments
       WHERE id = $1
       RETURNING id, order_id, amount, payment_method, reference, status, paid_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    res.json({
      message: "Payment deleted successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting payment:", error.message);

    res.status(500).json({
      message: "Failed to delete payment",
    });
  }
};

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
};
