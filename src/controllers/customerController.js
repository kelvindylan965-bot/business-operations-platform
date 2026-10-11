const pool = require("../config/database");

const getCustomers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, business_id, full_name, email, phone, address, created_at
       FROM customers
       WHERE business_id = $1
       ORDER BY id DESC`,
      [req.user.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching customers:", error.message);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, business_id, full_name, email, phone, address, created_at
       FROM customers
       WHERE id = $1 AND business_id = $2`,
      [id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching customer:", error.message);
    res.status(500).json({ message: "Failed to fetch customer" });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { full_name, email, phone, address } = req.body;

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ message: "full_name is required" });
    }

    const result = await pool.query(
      `INSERT INTO customers
       (business_id, full_name, email, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, business_id, full_name, email, phone, address, created_at`,
      [
        req.user.businessId,
        String(full_name).trim(),
        email || null,
        phone || null,
        address || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating customer:", error.message);
    res.status(500).json({ message: "Failed to create customer" });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, address } = req.body;

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ message: "full_name is required" });
    }

    const result = await pool.query(
      `UPDATE customers
       SET full_name = $1,
           email = $2,
           phone = $3,
           address = $4
       WHERE id = $5 AND business_id = $6
       RETURNING id, business_id, full_name, email, phone, address, created_at`,
      [
        String(full_name).trim(),
        email || null,
        phone || null,
        address || null,
        id,
        req.user.businessId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating customer:", error.message);
    res.status(500).json({ message: "Failed to update customer" });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM customers
       WHERE id = $1 AND business_id = $2
       RETURNING id, full_name`,
      [id, req.user.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({
      message: "Customer deleted successfully",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting customer:", error.message);
    res.status(500).json({ message: "Failed to delete customer" });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
