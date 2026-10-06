const express = require("express");

const {
  getOrders,
  getOrderById,
  createOrder,
  confirmOrder,
} = require("../controllers/orderController");

const router = express.Router();

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.post("/:id/confirm", confirmOrder);

module.exports = router;
