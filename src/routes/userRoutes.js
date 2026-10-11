const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const { createUser, getUsers } = require("../controllers/userController");

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles("admin"));

router.get("/", getUsers);
router.post("/", createUser);

module.exports = router;
