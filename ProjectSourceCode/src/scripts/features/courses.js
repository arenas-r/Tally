const express = require("express");
const router = express.Router();

// Requests here
router.get("/courses", async (req, res) => {
    res.status(200);
});

module.exports = router;