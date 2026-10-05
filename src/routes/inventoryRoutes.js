const express = require("express");

const {
  getInventory,
  getInventoryByProduct,
  getLowStock,
  createInventory,
  updateInventory,
} = require("../controllers/inventoryController");

const router = express.Router();

router.get("/", getInventory);
router.get("/low-stock", getLowStock);
router.get("/product/:product_id", getInventoryByProduct);
router.post("/", createInventory);
router.put("/product/:product_id", updateInventory);

module.exports = router;
