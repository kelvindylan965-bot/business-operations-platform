const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  verifyPayment,
  deletePayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getPayments);
router.get("/:id", getPaymentById);
router.post("/", createPayment);
router.put("/:id", authorizeRoles("admin"), updatePayment);
router.post("/:id/verify", authorizeRoles("admin"), verifyPayment);
router.delete("/:id", authorizeRoles("admin"), deletePayment);

module.exports = router;
