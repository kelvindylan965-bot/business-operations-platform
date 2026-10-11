const pool = require("../config/database");

const ALLOWED_PAYMENT_METHODS = [
  "cash",
  "mpesa",
  "card",
  "bank_transfer",
];

const ALLOWED_PAYMENT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "refunded",
];

const getPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.order_id, p.amount, p.payment_method, p.reference, p.status, p.paid_at
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE o.business_id = $1
       ORDER BY p.id DESC`,
      [req.user.businessId]
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
      `SELECT p.id, p.order_id, p.amount, p.payment_method, p.reference, p.status, p.paid_at
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE p.id = $1 AND o.business_id = $2`,
      [id, req.user.businessId]
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

    if (Number(amount) <= 0 || Number.isNaN(Number(amount))) {
      return res.status(400).json({
        message: "Payment amount must be greater than 0",
      });
    }

    const normalizedPaymentMethod = payment_method.trim().toLowerCase();

    if (!ALLOWED_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
        allowed: ALLOWED_PAYMENT_METHODS,
      });
    }

    if (
      status !== undefined &&
      String(status).trim().toLowerCase() !== "pending"
    ) {
      return res.status(400).json({
        message: "New payments must start as pending",
      });
    }

    const normalizedStatus = "pending";

    const orderResult = await pool.query(
      `SELECT id
       FROM orders
       WHERE id = $1 AND business_id = $2`,
      [order_id, req.user.businessId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found",
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
        normalizedPaymentMethod,
        reference?.trim() || null,
        normalizedStatus,
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

    if (Number(amount) <= 0 || Number.isNaN(Number(amount))) {
      return res.status(400).json({
        message: "Payment amount must be greater than 0",
      });
    }

    const normalizedPaymentMethod = payment_method.trim().toLowerCase();

    if (!ALLOWED_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
        allowed: ALLOWED_PAYMENT_METHODS,
      });
    }

    const normalizedStatus = status.trim().toLowerCase();

    if (!ALLOWED_PAYMENT_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Invalid payment status",
        allowed: ALLOWED_PAYMENT_STATUSES,
      });
    }

    if (["completed", "refunded"].includes(normalizedStatus)) {
      return res.status(400).json({
        message: "This payment status requires a trusted payment workflow",
      });
    }

    const result = await pool.query(
      `UPDATE payments
       SET amount = $1,
           payment_method = $2,
           reference = $3,
           status = $4,
           paid_at = NULL
       WHERE id = $5
         AND EXISTS (
           SELECT 1 FROM orders o
           WHERE o.id = payments.order_id
             AND o.business_id = $6
         )
       RETURNING id, order_id, amount, payment_method, reference, status, paid_at`,
      [
        amount,
        normalizedPaymentMethod,
        reference?.trim() || null,
        normalizedStatus,
        id,
        req.user.businessId,
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


const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE payments p
       SET status = 'completed',
           paid_at = CURRENT_TIMESTAMP
       FROM orders o
       WHERE p.id = $1
         AND o.id = p.order_id
         AND o.business_id = $2
         AND LOWER(p.status) = 'pending'
       RETURNING p.id, p.order_id, p.amount, p.payment_method,
                 p.reference, p.status, p.paid_at`,
      [id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pending payment not found",
      });
    }

    res.json({
      message: "Payment verified successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    res.status(500).json({
      message: "Failed to verify payment",
    });
  }
};


const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM payments p
       USING orders o
       WHERE p.id = $1
         AND o.id = p.order_id
         AND o.business_id = $2
         AND LOWER(p.status) NOT IN ('completed', 'refunded')
       RETURNING p.id, p.order_id, p.amount, p.payment_method, p.reference, p.status, p.paid_at`,
      [id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Payment not found or cannot be deleted",
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
  verifyPayment,
  deletePayment,

};
