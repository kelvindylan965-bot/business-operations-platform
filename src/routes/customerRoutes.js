const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  createCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.post("/", createCustomer);

module.exports = router;
