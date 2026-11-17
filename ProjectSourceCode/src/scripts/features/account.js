const express = require("express");
const router = express.Router();
const { db } = require("../db");

const PROFILE_FIELDS = `
  SELECT username, email, full_name, school, major, year_of_study
  FROM users
  WHERE user_id = $1
`;

router.get("/", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const profile = await db.one(PROFILE_FIELDS, [req.session.user.user_id]);
    res.render("account", {
      title: "Account | Tally",
      stylesheet: "account.css",
      profile,
      saved: req.query.saved === "1",
    });
  } catch (error) {
    console.error("Account page error:", error.message);
    res.status(500).send("Unable to load your account");
  }
});

router.post("/", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const profile = {
    full_name: (req.body.full_name || "").trim(),
    school: (req.body.school || "").trim(),
    major: (req.body.major || "").trim(),
    year_of_study: (req.body.year_of_study || "").trim(),
  };
  const limits = { full_name: 120, school: 160, major: 120, year_of_study: 40 };
  const validYears = ["", "Freshman", "Sophomore", "Junior", "Senior", "Graduate student", "Other"];
  const tooLong = Object.entries(limits).some(([field, max]) => profile[field].length > max)
    || !validYears.includes(profile.year_of_study);

  if (tooLong) {
    const current = await db.one(PROFILE_FIELDS, [req.session.user.user_id]);
    return res.status(400).render("account", {
      title: "Account | Tally",
      stylesheet: "account.css",
      profile: { ...current, ...profile },
      error: "Please check your entries and try again.",
    });
  }

  try {
    await db.none(
      `UPDATE users
       SET full_name = $1, school = $2, major = $3, year_of_study = $4
       WHERE user_id = $5`,
      [profile.full_name || null, profile.school || null, profile.major || null,
        profile.year_of_study || null, req.session.user.user_id]
    );
    return res.redirect("/account?saved=1");
  } catch (error) {
    console.error("Account update error:", error.message);
    const current = await db.one(PROFILE_FIELDS, [req.session.user.user_id]);
    return res.status(500).render("account", {
      title: "Account | Tally",
      stylesheet: "account.css",
      profile: { ...current, ...profile },
      error: "We could not save your changes. Please try again.",
    });
  }
});

module.exports = router;
