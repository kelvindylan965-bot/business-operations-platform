const express = require("express");

const {
  getOrders,
  getOrderById,
  createOrder,
  confirmOrder,
  cancelOrder,
} = require("../controllers/orderController");

const router = express.Router();

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.post("/:id/confirm", confirmOrder);
router.post("/:id/cancel", cancelOrder);

module.exports = router;
