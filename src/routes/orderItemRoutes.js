const express = require("express");

const {
  getOrderItems,
  getOrderItemById,
  updateOrderItem,
  deleteOrderItem,
  createOrderItem,
} = require("../controllers/orderItemController");

const router = express.Router();

router.get("/", getOrderItems);
router.get("/:id", getOrderItemById);
router.put("/:id", updateOrderItem);
router.delete("/:id", deleteOrderItem);
router.post("/", createOrderItem);

module.exports = router;
