const pool = require("../config/database");

const getCustomers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, business_id, full_name, email, phone, address, created_at FROM customers ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching customers:", error.message);

    res.status(500).json({
      message: "Failed to fetch customers",
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT id, business_id, full_name, email, phone, address, created_at FROM customers WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching customer:", error.message);

    res.status(500).json({
      message: "Failed to fetch customer",
    });
  }
};


const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { business_id, full_name, email, phone, address } = req.body;

    if (!business_id || !full_name) {
      return res.status(400).json({
        message: "business_id and full_name are required",
      });
    }

    const result = await pool.query(
      `UPDATE customers
       SET business_id = $1,
           full_name = $2,
           email = $3,
           phone = $4,
           address = $5
       WHERE id = $6
       RETURNING id, business_id, full_name, email, phone, address, created_at`,
      [business_id, full_name, email, phone, address, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating customer:", error.message);

    res.status(500).json({
      message: "Failed to update customer",
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM customers WHERE id = $1 RETURNING id, full_name",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.json({
      message: "Customer deleted successfully",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting customer:", error.message);

    res.status(500).json({
      message: "Failed to delete customer",
    });
  }
};
const createCustomer = async (req, res) => {
  try {

 const { business_id, full_name, email, phone, address } = req.body;

if (!business_id || !full_name) {
  return res.status(400).json({
    message: "business_id and full_name are required",
  });
}
    

    const result = await pool.query(
      `INSERT INTO customers
       (business_id, full_name, email, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, business_id, full_name, email, phone, address, created_at`,
      [business_id, full_name, email, phone, address]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating customer:", error.message);

    res.status(500).json({
      message: "Failed to create customer",
    });
  }
};
module.exports = {
  getCustomers,
  getCustomerById,
  updateCustomer, deleteCustomer,
  createCustomer,
};

