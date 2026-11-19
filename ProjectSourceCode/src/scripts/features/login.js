
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { db } = require("../db");
const { setUserSession } = require("./auth");

const validateRegistration = require("../validateRegistration");

router.use((req, res, next) => {
  try {
    res.locals.stylesheet = "login.css";
    res.locals.layout = "auth";
    next();
  } catch (error) {
    console.error("[AUTH] Middleware failed:", error);
    next(error);
  }
});

router.get("/", (req, res, next) => {
  try {
    res.render("login", {
      title: "Log in | Tally",
      success: req.query.registered
        ? "Account created. You can now log in."
        : null,
    });
  } catch (error) {
    console.error("[AUTH] Login page failed:", error);
    next(error);
  }
});

router.post("/", async (req, res) => {
  try {
    const loginInput = (req.body.email || "").trim();
    const loginInputLower = loginInput.toLowerCase();
    const password = req.body.password || "";

    const user = await db.oneOrNone(
      `SELECT user_id, username, email, password_hash
       FROM users
       WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
      [loginInputLower]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).render("login", {
        title: "Log in | Tally",
        error: "Email/username or password is incorrect.",
      });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error("[AUTH] Session regeneration failed:", err);
        return res.status(500).render("login", {
          title: "Log in | Tally",
          error: "We could not log you in right now. Please try again.",
        });
      }

      try {
        setUserSession(req, user);
        return res.redirect("/dashboard");
      } catch (error) {
        console.error("[AUTH] Session setup failed:", error);
        return res.status(500).render("login", {
          title: "Log in | Tally",
          error: "We could not log you in right now. Please try again.",
        });
      }
    });
  } catch (error) {
    console.error("[AUTH] Login failed:", error);

    return res.status(500).render("login", {
      title: "Log in | Tally",
      error: "We could not log you in right now. Please try again.",
    });
  }
});

router.get("/register", (req, res, next) => {
  try {
    res.render("register", {
      title: "Create an account | Tally",
    });
  } catch (error) {
    console.error("[AUTH] Registration page failed:", error);
    next(error);
  }
});

router.post("/register", async (req, res) => {
  const formData = {
    username: (req.body.username || "").trim(),
    email: (req.body.email || "").trim().toLowerCase(),
  };

  try {
    const { username, email } = formData;
    const password = req.body.password || "";
    const confirmPassword = req.body.confirmPassword || "";

    const validationError = validateRegistration({
      username,
      email,
      password,
      confirmPassword,
    });

    if (validationError) {
      console.warn("[AUTH] Registration validation failed:", validationError);

      return res.status(400).render("register", {
        title: "Create an account | Tally",
        error: validationError,
        formData,
      });
    }

    const existingUser = await db.oneOrNone(
      "SELECT user_id FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existingUser) {
      console.warn("[AUTH] Registration rejected: duplicate account");

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
    console.error("[AUTH] Registration failed:", error);

    if (error.code === "23505") {
      return res.status(409).render("register", {
        title: "Create an account | Tally",
        error: "That email or username is already in use.",
        formData,
      });
    }

    return res.status(500).render("register", {
      title: "Create an account | Tally",
      error: "We could not create your account right now. Please try again.",
      formData,
    });
  }
});

module.exports = router;