const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here
router.get("/",(req,res) => {
    res.send("Study Path page in progress(temporary test)")
});


module.exports = router;