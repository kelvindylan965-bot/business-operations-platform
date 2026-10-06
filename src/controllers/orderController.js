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

const confirmOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, business_id, customer_id, status, total_amount, created_at
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];

    if (order.status !== "pending") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Only pending orders can be confirmed",
      });
    }

    const itemsResult = await client.query(
      `SELECT product_id, SUM(quantity) AS quantity
       FROM order_items
       WHERE order_id = $1
       GROUP BY product_id`,
      [id]
    );

    if (itemsResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Order has no items",
      });
    }

    for (const item of itemsResult.rows) {
      const inventoryResult = await client.query(
        `SELECT product_id, quantity
         FROM inventory
         WHERE product_id = $1
         FOR UPDATE`,
        [item.product_id]
      );

      if (inventoryResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Inventory not found for product ${item.product_id}`,
        });
      }

      const availableQuantity = inventoryResult.rows[0].quantity;
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
        `UPDATE inventory
         SET quantity = quantity - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [requiredQuantity, item.product_id]
      );
    }

    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = 'confirmed'
       WHERE id = $1
       RETURNING id, business_id, customer_id, status, total_amount, created_at`,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      message: "Order confirmed successfully",
      order: updatedOrder.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error confirming order:", error.message);

    res.status(500).json({
      message: "Failed to confirm order",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  confirmOrder,
};
