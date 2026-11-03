const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here
router.get("/", (req,res) => {
    res.send("Calendar page is in progress (this is a temporary test)")
});


module.exports = router;