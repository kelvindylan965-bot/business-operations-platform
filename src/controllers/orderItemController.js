const pool = require("../config/database");

const getOrderItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, order_id, product_id, quantity, unit_price, subtotal, created_at
       FROM order_items
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching order items:", error.message);

    res.status(500).json({
      message: "Failed to fetch order items",
    });
  }
};

const getOrderItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, order_id, product_id, quantity, unit_price, subtotal, created_at
       FROM order_items
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Order item not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching order item:", error.message);

    res.status(500).json({
      message: "Failed to fetch order item",
    });
  }
};

const createOrderItem = async (req, res) => {
  try {
    const { order_id, product_id, quantity, unit_price } = req.body;

    if (!order_id || !product_id || quantity === undefined || unit_price === undefined) {
      return res.status(400).json({
        message: "order_id, product_id, quantity and unit_price are required",
      });
    }

    const subtotal = quantity * unit_price;

    const itemResult = await pool.query(
      `INSERT INTO order_items
       (order_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, order_id, product_id, quantity, unit_price, subtotal, created_at`,
      [order_id, product_id, quantity, unit_price, subtotal]
    );

    await pool.query(
      `UPDATE orders
       SET total_amount = (
         SELECT COALESCE(SUM(subtotal), 0)
         FROM order_items
         WHERE order_id = $1
       )
       WHERE id = $1`,
      [order_id]
    );

    res.status(201).json(itemResult.rows[0]);
  } catch (error) {
    console.error("Error creating order item:", error.message);

    res.status(500).json({
      message: "Failed to create order item",
    });
  }
};

const updateOrderItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unit_price } = req.body;

    if (quantity === undefined || unit_price === undefined) {
      return res.status(400).json({
        message: "quantity and unit_price are required",
      });
    }

    const subtotal = quantity * unit_price;

    const itemResult = await pool.query(
      `UPDATE order_items
       SET quantity = $1,
           unit_price = $2,
           subtotal = $3
       WHERE id = $4
       RETURNING id, order_id, product_id, quantity, unit_price, subtotal, created_at`,
      [quantity, unit_price, subtotal, id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        message: "Order item not found",
      });
    }

    const orderId = itemResult.rows[0].order_id;

    await pool.query(
      `UPDATE orders
       SET total_amount = (
         SELECT COALESCE(SUM(subtotal), 0)
         FROM order_items
         WHERE order_id = $1
       )
       WHERE id = $1`,
      [orderId]
    );

    res.json(itemResult.rows[0]);
  } catch (error) {
    console.error("Error updating order item:", error.message);

    res.status(500).json({
      message: "Failed to update order item",
    });
  }
};
const deleteOrderItem = async (req, res) => {
  try {
    const { id } = req.params;

    const itemResult = await pool.query(
      `DELETE FROM order_items
       WHERE id = $1
       RETURNING id, order_id, product_id, quantity, unit_price, subtotal, created_at`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        message: "Order item not found",
      });
    }

    const orderId = itemResult.rows[0].order_id;

    await pool.query(
      `UPDATE orders
       SET total_amount = (
         SELECT COALESCE(SUM(subtotal), 0)
         FROM order_items
         WHERE order_id = $1
       )
       WHERE id = $1`,
      [orderId]
    );

    res.json({
      message: "Order item deleted successfully",
      orderItem: itemResult.rows[0],
    });
  } catch (error) {
    console.error("Error deleting order item:", error.message);

    res.status(500).json({
      message: "Failed to delete order item",
    });
  }
};
module.exports = {
  getOrderItems,
  getOrderItemById,
  updateOrderItem,
  deleteOrderItem,
  createOrderItem,
};
