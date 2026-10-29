const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here
router.get("/courses", async (req, res) => {
    res.status(200);
});

module.exports = router;