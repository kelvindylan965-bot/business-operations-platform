const express = require("express");
const pool = require("./config/database");
const productRoutes = require("./routes/productRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const orderItemRoutes = require("./routes/orderItemRoutes");
const customerRoutes = require("./routes/customerRoutes");
const app = express();
app.use(express.json());
const PORT = 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Business Operations Platform API is running",
  });
});
app.use("/api/customers", customerRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/order-items", orderItemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
