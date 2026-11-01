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

export async function getUpcomingAssignments(userId, courseId) {
    return await db.any(
        `
        SELECT a.*
        FROM assignments a
        JOIN courses c
            ON a.course_id = c.course_id
        WHERE c.user_id = $1
          AND c.course_id = $2
          AND a.completed = FALSE
          AND a.due_date >= CURRENT_TIMESTAMP
        ORDER BY a.due_date
        LIMIT 3;
        `,
        [userId, courseId]
    );
}

router.get("/courses", async (req, res) => {
    try {
        const userId = getUser(req);
        const courses = await getCourses(userId);

        res.render("courses", {
            courses
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
    }
});

router.get("/courses/:id", async (req, res) => {
    res.status(200);
});

router.get("/courses/:id/assignments", async (req, res) => {
    res.status(200);
});

module.exports = router;