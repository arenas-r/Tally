const express = require("express");
const router = express.Router();

const db = require("../db");

async function getUser(req) {
    return req.session.user.id ?? "igotsomesalt"; // TODO: REFACTOR THIS LATER
}

export async function getCourses(userId) {
    return courses = await db.any(
        `SELECT *
            FROM courses
            WHERE user_id = $1;`,
        [userId]
    );
}

router.get("/courses", async (req, res) => {
    const userId = getUser(req);
    const courses = getCourses(userId);
    res.render('courses', courses);
});

router.get("/courses/:id", async (req, res) => {
    res.status(200);
});

router.get("/courses/:id/assignments", async (req, res) => {
    res.status(200);
});

module.exports = router;