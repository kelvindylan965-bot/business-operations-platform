const express = require("express");

const { bootstrapAdmin } = require("../controllers/bootstrapController");

const router = express.Router();

router.post("/admin", bootstrapAdmin);

module.exports = router;
