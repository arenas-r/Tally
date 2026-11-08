const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.user_id;

        const assignments = await db.any(
            `SELECT
                a.assignment_name,
                a.due_date,
                a.priority,
                c.course_name
            FROM assignments a
            JOIN courses c
                ON a.course_id = c.course_id
            WHERE c.user_id = $1
                AND a.completed = FALSE
                AND a.due_date >= CURRENT_TIMESTAMP
            ORDER BY a.due_date ASC;`,
            [userId]
        );

        const courses = await db.any(
            `SELECT course_name, course_code
             FROM courses
             WHERE user_id = $1;`,
            [userId]
        );

        const workload = await db.one(
            `SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE a.completed = TRUE) AS completed
             FROM assignments a
             JOIN courses c
                ON a.course_id = c.course_id
             WHERE c.user_id = $1
                AND a.due_date >= DATE_TRUNC('week', CURRENT_DATE)
                AND a.due_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days';`,
            [userId]
        );

        const completionPercentage = Number(workload.total) > 0
            ? Math.round((Number(workload.completed) / Number(workload.total)) * 100)
            : 0;

        res.render("dashboard", {
            assignments,
            courses,
            workload,
            completionPercentage
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).send("Unable to load dashboard");
    }
});

module.exports = router;
