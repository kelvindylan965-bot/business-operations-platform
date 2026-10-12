const pool = require("../config/database");

const getOrderItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity,
              oi.unit_price, oi.subtotal, oi.created_at
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.business_id = $1
       ORDER BY oi.id DESC`,
      [req.user.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching order items:", error.message);
    res.status(500).json({ message: "Failed to fetch order items" });
  }
};

const getOrderItemById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity,
              oi.unit_price, oi.subtotal, oi.created_at
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = $1 AND o.business_id = $2`,
      [req.params.id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order item not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching order item:", error.message);
    res.status(500).json({ message: "Failed to fetch order item" });
  }
};

const createOrderItem = async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const { order_id, product_id, quantity } = req.body;
    const businessId = req.user.businessId;

    if (
      order_id === undefined ||
      product_id === undefined ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        message: "Valid order_id, product_id, and positive integer quantity are required",
      });
    }

    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, status FROM orders
       WHERE id = $1 AND business_id = $2
       FOR UPDATE`,
      [order_id, businessId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    if (orderResult.rows[0].status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Items can only be added to pending orders",
      });
    }

    const productResult = await client.query(
      `SELECT id, price FROM products
       WHERE id = $1 AND business_id = $2`,
      [product_id, businessId]
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Product not found for this business",
      });
    }

    const unitPrice = Number(productResult.rows[0].price);

    const itemResult = await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, order_id, product_id, quantity, unit_price, subtotal, created_at`,
      [
        order_id,
        product_id,
        Number(quantity),
        unitPrice,
        Number(quantity) * unitPrice,
      ]
    );

    await client.query(
      `UPDATE orders
       SET total_amount = (
         SELECT COALESCE(SUM(subtotal), 0)
         FROM order_items
         WHERE order_id = $1
       )
       WHERE id = $1 AND business_id = $2`,
      [order_id, businessId]
    );

    await client.query("COMMIT");
    res.status(201).json(itemResult.rows[0]);
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Error creating order item:", error.message);
    res.status(500).json({ message: "Failed to create order item" });
  } finally {
    if (client) client.release();
  }
};

const updateOrderItem = async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const { id } = req.params;
    const { quantity } = req.body;

    if (
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        message: "A positive integer quantity is required",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT oi.id, oi.order_id, oi.unit_price, o.status
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = $1 AND o.business_id = $2
       FOR UPDATE OF o`,
      [id, req.user.businessId]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order item not found" });
    }

    const existing = existingResult.rows[0];

    if (existing.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Items can only be edited on pending orders",
      });
    }

    const itemResult = await client.query(
      `UPDATE order_items
       SET quantity = $1, subtotal = $2
       WHERE id = $3 AND order_id = $4
       RETURNING id, order_id, product_id, quantity, unit_price, subtotal, created_at`,
      [
        Number(quantity),
        Number(quantity) * Number(existing.unit_price),
        id,
        existing.order_id,
      ]
    );

    await client.query(
      `UPDATE orders
       SET total_amount = (
         SELECT COALESCE(SUM(subtotal), 0)
         FROM order_items
         WHERE order_id = $1
       )
       WHERE id = $1 AND business_id = $2`,
      [existing.order_id, req.user.businessId]
    );

    await client.query("COMMIT");
    res.json(itemResult.rows[0]);
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Error updating order item:", error.message);
    res.status(500).json({ message: "Failed to update order item" });
  } finally {
    if (client) client.release();
  }
};

const deleteOrderItem = async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const { id } = req.params;

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT oi.id, oi.order_id, o.status
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = $1 AND o.business_id = $2
       FOR UPDATE OF o`,
      [id, req.user.businessId]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order item not found" });
    }

    const existing = existingResult.rows[0];

    if (existing.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Items can only be deleted from pending orders",
      });
    }

    const itemResult = await client.query(
      `DELETE FROM order_items
       WHERE id = $1 AND order_id = $2
       RETURNING id, order_id, product_id, quantity, unit_price, subtotal, created_at`,
      [id, existing.order_id]
    );

    await client.query(
      `UPDATE orders
       SET total_amount = (
         SELECT COALESCE(SUM(subtotal), 0)
         FROM order_items
         WHERE order_id = $1
       )
       WHERE id = $1 AND business_id = $2`,
      [existing.order_id, req.user.businessId]
    );

    await client.query("COMMIT");

    res.json({
      message: "Order item deleted successfully",
      orderItem: itemResult.rows[0],
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Error deleting order item:", error.message);
    res.status(500).json({ message: "Failed to delete order item" });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getOrderItems,
  getOrderItemById,
  createOrderItem,
  updateOrderItem,
  deleteOrderItem,
};
