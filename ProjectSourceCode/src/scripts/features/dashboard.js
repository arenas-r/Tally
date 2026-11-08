
const express = require("express");
const router = express.Router();

const db = require("../db");

// Requests here
router.get("/", async (req,res) => {

if (!req.session.user) {
    return res.redirect("/login");
}

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
    `SELECT course_name, 
    course_code
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

res.render("dashboard", {
    assignments,
    courses,
    workload
});

});

module.exports = router;
// Display the dashboard
router.get("/", async (req, res) => {
    try {
        // Temporary test user
        const userID = 1;

        // Get upcoming incomplete assignments
        const assignments = await db.any(
            `
            SELECT
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
            ORDER BY a.due_date ASC;
            `,
            [userID]
        );

        // Display the dashboard with assignments
        res.render("dashboard", {
            assignments: assignments
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).send("Unable to load dashboard");
    }
});

module.exports = router;
