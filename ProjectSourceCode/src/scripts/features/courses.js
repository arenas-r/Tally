const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here
router.get("/", (req,res) => {
    res.send("Courses page in progress(this is a test)")
});

module.exports = router;