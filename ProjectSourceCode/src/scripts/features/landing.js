const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("landing", {
    title: "Tally | Coursework tracker for students",
    layout: false,
  });
});

module.exports = router;