const pool = require("../config/database");

const getExpenses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, business_id, description, category, amount, expense_date, created_at
       FROM expenses
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching expenses:", error.message);

    res.status(500).json({
      message: "Failed to fetch expenses",
    });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, business_id, description, category, amount, expense_date, created_at
       FROM expenses
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching expense:", error.message);

    res.status(500).json({
      message: "Failed to fetch expense",
    });
  }
};

const createExpense = async (req, res) => {
  try {
    const {
      business_id,
      description,
      category,
      amount,
      expense_date,
    } = req.body;

    if (
      !business_id ||
      !description ||
      !category ||
      amount === undefined
    ) {
      return res.status(400).json({
        message: "business_id, description, category and amount are required",
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Expense amount must be greater than 0",
      });
    }

    const businessResult = await pool.query(
      `SELECT id
       FROM businesses
       WHERE id = $1`,
      [business_id]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    const result = await pool.query(
      `INSERT INTO expenses
       (business_id, description, category, amount, expense_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, business_id, description, category, amount, expense_date, created_at`,
      [
        business_id,
        description,
        category,
        amount,
        expense_date ?? new Date().toISOString().split("T")[0],
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating expense:", error.message);

    res.status(500).json({
      message: "Failed to create expense",
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description,
      category,
      amount,
      expense_date,
    } = req.body;

    if (
      !description ||
      !category ||
      amount === undefined ||
      !expense_date
    ) {
      return res.status(400).json({
        message: "description, category, amount and expense_date are required",
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Expense amount must be greater than 0",
      });
    }
    const result = await pool.query(
      `UPDATE expenses
       SET description = $1,
           category = $2,
           amount = $3,
           expense_date = $4
       WHERE id = $5
       RETURNING id, business_id, description, category, amount, expense_date, created_at`,
      [
        description,
        category,
        amount,
        expense_date,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating expense:", error.message);

    res.status(500).json({
      message: "Failed to update expense",
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM expenses
       WHERE id = $1
       RETURNING id, business_id, description, category, amount, expense_date, created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    res.json({
      message: "Expense deleted successfully",
      expense: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting expense:", error.message);

    res.status(500).json({
      message: "Failed to delete expense",
    });
  }
};

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};
