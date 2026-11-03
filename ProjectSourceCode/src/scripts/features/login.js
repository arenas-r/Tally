const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  res.render("login", {
    title: "Log in | Tally",
    success: req.query.registered ? "Account created. You can now log in." : null,
  });
});

router.get("/register", (req, res) => {
  res.render("register", {
    title: "Create an account | Tally",
  });
});

router.post("/register", async (req, res) => {
  const username = (req.body.username || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  const confirmPassword = req.body.confirmPassword || "";

  const formData = { username, email };

  if (username.length < 2 || username.length > 64) {
    return res.status(400).render("register", {
      title: "Create an account | Tally",
      error: "Username must be between 2 and 64 characters.",
      formData,
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return res.status(400).render("register", {
      title: "Create an account | Tally",
      error: "Enter a valid email address.",
      formData,
    });
  }

  if (password.length < 8) {
    return res.status(400).render("register", {
      title: "Create an account | Tally",
      error: "Password must be at least 8 characters.",
      formData,
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).render("register", {
      title: "Create an account | Tally",
      error: "Passwords do not match.",
      formData,
    });
  }

  try {
    const existingUser = await db.oneOrNone(
      "SELECT user_id FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existingUser) {
      return res.status(409).render("register", {
        title: "Create an account | Tally",
        error: "An account with that email or username already exists.",
        formData,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.none(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
      [username, email, passwordHash]
    );

    return res.redirect("/login?registered=1");
  } catch (error) {
    console.error("Registration failed:", error.message);
    return res.status(500).render("register", {
      title: "Create an account | Tally",
      error: "We could not create your account right now. Please try again.",
      formData,
    });
  }
});

module.exports = router;