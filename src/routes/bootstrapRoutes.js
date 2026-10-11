const express = require("express");

const { bootstrapAdmin } = require("../controllers/bootstrapController");

const router = express.Router();

if (process.env.ENABLE_ADMIN_BOOTSTRAP === "true") {
  router.post("/admin", bootstrapAdmin);
} else {
  router.post("/admin", (req, res) => {
    res.status(404).json({
      message: "Admin bootstrap is disabled",
    });
  });
}

module.exports = router;
