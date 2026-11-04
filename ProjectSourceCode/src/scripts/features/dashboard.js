const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here
router.get("/", async (req,res) => {
    res.render("dashboard");

const userID = req.session.user.user_id;

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
[userid]
);
});

module.exports = router;