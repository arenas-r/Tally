const express = require("express");
const router = express.Router();

const db = require("../db")

router.get("/courses", async (req, res) => {
    const id = req.session.user.id ?? "igotsomesalt"; // TODO: REFACTOR THIS LATER
    const courses = db.any(
        `   SELECT *
            FROM courses
            WHERE user_id = $1;`,
        [id]
    );

    res.render('courses', courses);
});

router.get("/courses/:id", async (req, res) => {
    res.status(200);
});

router.get("/courses/:id/assignments", async (req, res) => {
    res.status(200);
});

module.exports = router;