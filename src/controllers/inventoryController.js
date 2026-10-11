const pool = require("../config/database");

const getInventory = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(403).json({ message: "Your account is not linked to a business" });
    }

    const result = await pool.query(
      `SELECT i.id, i.product_id, p.name AS product_name,
              i.quantity, i.reorder_level, i.updated_at
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE p.business_id = $1
       ORDER BY i.id DESC`,
      [businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching inventory:", error.message);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
};

const getInventoryByProduct = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { product_id } = req.params;

    if (!businessId) {
      return res.status(403).json({ message: "Your account is not linked to a business" });
    }

    const result = await pool.query(
      `SELECT i.id, i.product_id, p.name AS product_name,
              i.quantity, i.reorder_level, i.updated_at
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE i.product_id = $1 AND p.business_id = $2`,
      [product_id, businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Inventory not found for this product" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching inventory:", error.message);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
};

const getLowStock = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(403).json({ message: "Your account is not linked to a business" });
    }

    const result = await pool.query(
      `SELECT i.id, i.product_id, p.name AS product_name,
              i.quantity, i.reorder_level, i.updated_at
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE p.business_id = $1
         AND i.quantity <= i.reorder_level
       ORDER BY i.quantity ASC`,
      [businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching low-stock inventory:", error.message);
    res.status(500).json({ message: "Failed to fetch low-stock inventory" });
  }
};

const createInventory = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { product_id, quantity = 0, reorder_level = 5 } = req.body;

    if (!businessId) {
      return res.status(403).json({ message: "Your account is not linked to a business" });
    }

    if (!Number.isInteger(Number(product_id)) || Number(product_id) <= 0) {
      return res.status(400).json({ message: "A valid product_id is required" });
    }

    if (
      !Number.isInteger(Number(quantity)) || Number(quantity) < 0 ||
      !Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0
    ) {
      return res.status(400).json({
        message: "quantity and reorder_level must be non-negative integers",
      });
    }

    const product = await pool.query(
      "SELECT id FROM products WHERE id = $1 AND business_id = $2",
      [Number(product_id), businessId]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ message: "Product not found for your business" });
    }

    const result = await pool.query(
      `INSERT INTO inventory (product_id, quantity, reorder_level)
       VALUES ($1, $2, $3)
       RETURNING id, product_id, quantity, reorder_level, updated_at`,
      [Number(product_id), Number(quantity), Number(reorder_level)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Inventory already exists for this product" });
    }

    console.error("Error creating inventory:", error.message);
    res.status(500).json({ message: "Failed to create inventory" });
  }
};

const updateInventory = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { product_id } = req.params;
    const { quantity, reorder_level } = req.body;

    if (!businessId) {
      return res.status(403).json({ message: "Your account is not linked to a business" });
    }

    if (!Number.isInteger(Number(product_id)) || Number(product_id) <= 0) {
      return res.status(400).json({ message: "A valid product_id is required" });
    }

    if (quantity === undefined || reorder_level === undefined) {
      return res.status(400).json({ message: "quantity and reorder_level are required" });
    }

    if (
      !Number.isInteger(Number(quantity)) || Number(quantity) < 0 ||
      !Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0
    ) {
      return res.status(400).json({
        message: "quantity and reorder_level must be non-negative integers",
      });
    }

    const result = await pool.query(
      `UPDATE inventory AS i
       SET quantity = $1,
           reorder_level = $2,
           updated_at = CURRENT_TIMESTAMP
       FROM products AS p
       WHERE i.product_id = p.id
         AND i.product_id = $3
         AND p.business_id = $4
       RETURNING i.id, i.product_id, i.quantity, i.reorder_level, i.updated_at`,
      [Number(quantity), Number(reorder_level), product_id, businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Inventory not found for this product" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating inventory:", error.message);
    res.status(500).json({ message: "Failed to update inventory" });
  }
};

module.exports = {
  getInventory,
  getInventoryByProduct,
  getLowStock,
  createInventory,
  updateInventory,
};
