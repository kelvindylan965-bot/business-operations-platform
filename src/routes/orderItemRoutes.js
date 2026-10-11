const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getOrderItems,
  getOrderItemById,
  updateOrderItem,
  deleteOrderItem,
  createOrderItem,
} = require("../controllers/orderItemController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getOrderItems);
router.get("/:id", getOrderItemById);
router.put("/:id", updateOrderItem);
router.delete("/:id", deleteOrderItem);
router.post("/", createOrderItem);

module.exports = router;
