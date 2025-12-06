// minimalProxy.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ working: true });
});

module.exports = router;