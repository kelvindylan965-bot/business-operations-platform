const pool = require("../config/database");

const getProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, business_id, name, description, price, created_at
       FROM products
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error.message);

    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, business_id, name, description, price, created_at
       FROM products
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error.message);

    res.status(500).json({
      message: "Failed to fetch product",
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { business_id, name, description, price } = req.body;

    if (!business_id || !name || price === undefined) {
      return res.status(400).json({
        message: "business_id, name and price are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO products
       (business_id, name, description, price)
       VALUES ($1, $2, $3, $4)
       RETURNING id, business_id, name, description, price, created_at`,
      [business_id, name, description, price]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating product:", error.message);

    res.status(500).json({
      message: "Failed to create product",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        message: "name and price are required",
      });
    }

    const result = await pool.query(
      `UPDATE products
       SET name = $1, description = $2, price = $3
       WHERE id = $4
       RETURNING id, business_id, name, description, price, created_at`,
      [name, description, price, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error.message);

    res.status(500).json({
      message: "Failed to update product",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM products
       WHERE id = $1
       RETURNING id, business_id, name, description, price, created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product deleted successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting product:", error.message);

    res.status(500).json({
      message: "Failed to delete product",
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
