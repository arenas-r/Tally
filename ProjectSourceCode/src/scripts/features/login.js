const express = require("express");
const router = express.Router();

// Show the login page at http://localhost:3000/login
router.get("/", (req, res) => {
  res.render("login", {
    title: "Log in | Tally",
  });
});

module.exports = router;