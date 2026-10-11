const pool = require("../config/database");

const getOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, business_id, customer_id, status, total_amount, created_at
       FROM orders
       WHERE business_id = $1
       ORDER BY id DESC`,
      [req.user.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, business_id, customer_id, status, total_amount, created_at
       FROM orders
       WHERE id = $1 AND business_id = $2`,
      [req.params.id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching order:", error.message);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

const createOrder = async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const { customer_id, items } = req.body;
    const businessId = req.user.businessId;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Add at least one product before creating the order",
      });
    }

    for (const item of items) {
      if (
        item.product_id === undefined ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          message: "Each item must have a valid product_id and positive integer quantity",
        });
      }
    }

    await client.query("BEGIN");

    let customerId = null;

    if (customer_id !== undefined && customer_id !== null && customer_id !== "") {
      const customerResult = await client.query(
        `SELECT id FROM customers
         WHERE id = $1 AND business_id = $2`,
        [customer_id, businessId]
      );

      if (customerResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Customer not found for this business",
        });
      }

      customerId = customerResult.rows[0].id;
    }

    const orderResult = await client.query(
      `INSERT INTO orders (business_id, customer_id, status, total_amount)
       VALUES ($1, $2, 'pending', 0)
       RETURNING id, business_id, customer_id, status, total_amount, created_at`,
      [businessId, customerId]
    );

    const order = orderResult.rows[0];
    let totalAmount = 0;
    const createdItems = [];

    for (const item of items) {
      const productResult = await client.query(
        `SELECT id, price FROM products
         WHERE id = $1 AND business_id = $2`,
        [item.product_id, businessId]
      );

      if (productResult.rows.length === 0) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const product = productResult.rows[0];
      const quantity = Number(item.quantity);
      const unitPrice = Number(product.price);
      const subtotal = quantity * unitPrice;

      const itemResult = await client.query(
        `INSERT INTO order_items
           (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, order_id, product_id, quantity, unit_price, subtotal, created_at`,
        [order.id, product.id, quantity, unitPrice, subtotal]
      );

      createdItems.push(itemResult.rows[0]);
      totalAmount += subtotal;
    }

    const updatedOrderResult = await client.query(
      `UPDATE orders
       SET total_amount = $1
       WHERE id = $2 AND business_id = $3
       RETURNING id, business_id, customer_id, status, total_amount, created_at`,
      [totalAmount, order.id, businessId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      ...updatedOrderResult.rows[0],
      items: createdItems,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});

    if (error.message === "PRODUCT_NOT_FOUND") {
      return res.status(400).json({
        message: "One or more products were not found for this business",
      });
    }

    console.error("Error creating order:", error.message);
    res.status(500).json({ message: "Failed to create order" });
  } finally {
    if (client) client.release();
  }
};

const confirmOrder = async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const { id } = req.params;
    const businessId = req.user.businessId;

    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, business_id, customer_id, status, total_amount, created_at
       FROM orders
       WHERE id = $1 AND business_id = $2
       FOR UPDATE`,
      [id, businessId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (order.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Only pending orders can be confirmed",
      });
    }

    const itemsResult = await client.query(
      `SELECT oi.product_id, SUM(oi.quantity)::integer AS quantity
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1 AND p.business_id = $2
       GROUP BY oi.product_id`,
      [id, businessId]
    );

    const invalidItemsResult = await client.query(
      `SELECT COUNT(*)::integer AS count
       FROM order_items oi
       LEFT JOIN products p
         ON p.id = oi.product_id AND p.business_id = $2
       WHERE oi.order_id = $1 AND p.id IS NULL`,
      [id, businessId]
    );

    if (
      itemsResult.rows.length === 0 ||
      invalidItemsResult.rows[0].count > 0
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Order has no valid items for this business",
      });
    }

    for (const item of itemsResult.rows) {
      const inventoryResult = await client.query(
        `SELECT i.product_id, i.quantity
         FROM inventory i
         JOIN products p ON p.id = i.product_id
         WHERE i.product_id = $1 AND p.business_id = $2
         FOR UPDATE OF i`,
        [item.product_id, businessId]
      );

      if (inventoryResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Inventory not found for product ${item.product_id}`,
        });
      }

      const availableQuantity = Number(inventoryResult.rows[0].quantity);
      const requiredQuantity = Number(item.quantity);

      if (availableQuantity < requiredQuantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Insufficient stock for product ${item.product_id}`,
          available: availableQuantity,
          required: requiredQuantity,
        });
      }

      await client.query(
        `UPDATE inventory AS i
         SET quantity = i.quantity - $1, updated_at = CURRENT_TIMESTAMP
         FROM products AS p
         WHERE i.product_id = p.id
           AND i.product_id = $2
           AND p.business_id = $3`,
        [requiredQuantity, item.product_id, req.user.businessId]
      );
    }

    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = 'confirmed'
       WHERE id = $1 AND business_id = $2
       RETURNING id, business_id, customer_id, status, total_amount, created_at`,
      [id, businessId]
    );

    await client.query("COMMIT");

    res.json({
      message: "Order confirmed successfully",
      order: updatedOrder.rows[0],
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Error confirming order:", error.message);
    res.status(500).json({ message: "Failed to confirm order" });
  } finally {
    if (client) client.release();
  }
};

const cancelOrder = async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const { id } = req.params;
    const businessId = req.user.businessId;

    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, business_id, customer_id, status, total_amount, created_at
       FROM orders
       WHERE id = $1 AND business_id = $2
       FOR UPDATE`,
      [id, businessId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (order.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    if (order.status === "completed") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Completed orders cannot be cancelled",
      });
    }

    const itemsResult = await client.query(
      `SELECT oi.product_id, SUM(oi.quantity)::integer AS quantity
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1 AND p.business_id = $2
       GROUP BY oi.product_id`,
      [id, businessId]
    );

    if (order.status === "confirmed") {
      for (const item of itemsResult.rows) {
        const inventoryResult = await client.query(
          `SELECT i.product_id
           FROM inventory i
           JOIN products p ON p.id = i.product_id
           WHERE i.product_id = $1 AND p.business_id = $2
           FOR UPDATE OF i`,
          [item.product_id, businessId]
        );

        if (inventoryResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Inventory not found for product ${item.product_id}`,
          });
        }

        await client.query(
          `UPDATE inventory AS i
           SET quantity = i.quantity + $1, updated_at = CURRENT_TIMESTAMP
           FROM products AS p
           WHERE i.product_id = p.id
             AND i.product_id = $2
             AND p.business_id = $3`,
          [Number(item.quantity), item.product_id, req.user.businessId]
        );
      }
    }

    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = 'cancelled'
       WHERE id = $1 AND business_id = $2
       RETURNING id, business_id, customer_id, status, total_amount, created_at`,
      [id, businessId]
    );

    await client.query("COMMIT");

    res.json({
      message: "Order cancelled successfully",
      order: updatedOrder.rows[0],
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Error cancelling order:", error.message);
    res.status(500).json({ message: "Failed to cancel order" });
  } finally {
    if (client) client.release();
  }
};

const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const orderResult = await pool.query(
      `SELECT id, business_id, customer_id, status, total_amount, created_at
       FROM orders
       WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (order.status === "pending") {
      return res.status(400).json({
        message: "Only confirmed orders can be completed",
      });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        message: "Cancelled orders cannot be completed",
      });
    }

    if (order.status === "completed") {
      return res.status(400).json({ message: "Order is already completed" });
    }

    const updatedOrder = await pool.query(
      `UPDATE orders
       SET status = 'completed'
       WHERE id = $1 AND business_id = $2 AND status = 'confirmed'
       RETURNING id, business_id, customer_id, status, total_amount, created_at`,
      [id, businessId]
    );

    if (updatedOrder.rows.length === 0) {
      return res.status(409).json({
        message: "Order status changed; please refresh and try again",
      });
    }

    res.json({
      message: "Order completed successfully",
      order: updatedOrder.rows[0],
    });
  } catch (error) {
    console.error("Error completing order:", error.message);
    res.status(500).json({ message: "Failed to complete order" });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  confirmOrder,
  cancelOrder,
  completeOrder,
};
