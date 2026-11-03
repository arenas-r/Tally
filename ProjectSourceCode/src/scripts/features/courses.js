const express = require("express");
const router = express.Router();

const db = require("../db");

// Requests here
router.get("/", (req,res) => {
    res.send("Courses page in progress(this is a test)")
});
async function getUser(req) {
    return req.session.user.user_id ?? "igotsomesalt"; // TODO: REFACTOR THIS LATER
}

async function getCourses(userId) {
    return await db.any(
        `SELECT *
         FROM courses
         WHERE user_id = $1;`,
        [userId]
    );
}

async function getCourse(userId, courseId) {
    return await db.oneOrNone(
        `SELECT *
         FROM courses
         WHERE user_id = $1
           AND course_id = $2;`,
        [userId, courseId]
    );
}

async function getUpcomingAssignments(userId, courseId) {
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

router.get("/", async (req, res) => {
    try {
        const userId = await getUser(req);
        const courses = await getCourses(userId);

        res.render("courses", {
            courses
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
    }
});

router.get("/:id", async (req, res) => {
    try {
        const userId = await getUser(req);
        const courseId = req.params.id;

        const courses = await getCourses(userId);

        const selectedCourse = await getCourse(
            userId,
            courseId
        );

        if (!selectedCourse) {
            return res.status(404).send("Course not found");
        }

        const assignments = await getUpcomingAssignments(
            userId,
            courseId
        );

        res.render("courses", {
            courses,
            selectedCourse,
            assignments
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
    }
});

module.exports = {
    router,
    getCourses,
    getUpcomingAssignments
};
