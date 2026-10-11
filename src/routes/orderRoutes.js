const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getOrders,
  getOrderById,
  createOrder,
  confirmOrder,
  cancelOrder,
  completeOrder,
} = require("../controllers/orderController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.post("/:id/confirm", confirmOrder);
router.post("/:id/cancel", cancelOrder);
router.post("/:id/complete", completeOrder);

module.exports = router;
