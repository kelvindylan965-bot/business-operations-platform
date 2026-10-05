const pool = require("../config/database");

const getInventory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, product_id, quantity, reorder_level, updated_at
       FROM inventory
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching inventory:", error.message);

    res.status(500).json({
      message: "Failed to fetch inventory",
    });
  }
};

const getInventoryByProduct = async (req, res) => {
  try {
    const { product_id } = req.params;

    const result = await pool.query(
      `SELECT id, product_id, quantity, reorder_level, updated_at
       FROM inventory
       WHERE product_id = $1`,
      [product_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Inventory not found for this product",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching inventory:", error.message);

    res.status(500).json({
      message: "Failed to fetch inventory",
    });
  }
};

const getLowStock = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, product_id, quantity, reorder_level, updated_at
       FROM inventory
       WHERE quantity <= reorder_level
       ORDER BY quantity ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching low-stock inventory:", error.message);

    res.status(500).json({
      message: "Failed to fetch low-stock inventory",
    });
  }
};

const createInventory = async (req, res) => {
  try {
    const { product_id, quantity, reorder_level } = req.body;

    if (!product_id) {
      return res.status(400).json({
        message: "product_id is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO inventory
       (product_id, quantity, reorder_level)
       VALUES ($1, $2, $3)
       RETURNING id, product_id, quantity, reorder_level, updated_at`,
      [
        product_id,
        quantity ?? 0,
        reorder_level ?? 5,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating inventory:", error.message);

    res.status(500).json({
      message: "Failed to create inventory",
    });
  }
};

const updateInventory = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { quantity, reorder_level } = req.body;

    if (quantity === undefined || reorder_level === undefined) {
      return res.status(400).json({
        message: "quantity and reorder_level are required",
      });
    }

    const result = await pool.query(
      `UPDATE inventory
       SET quantity = $1,
           reorder_level = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $3
       RETURNING id, product_id, quantity, reorder_level, updated_at`,
      [quantity, reorder_level, product_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Inventory not found for this product",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating inventory:", error.message);

    res.status(500).json({
      message: "Failed to update inventory",
    });
  }
};

module.exports = {
  getInventory,
  getInventoryByProduct,
  getLowStock,
  createInventory,
  updateInventory,
};
