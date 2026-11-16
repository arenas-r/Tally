const express = require("express");
const router = express.Router();

const { db } = require("../db");

// Requests here
async function getUser(req) {
    return 1; // TODO: REFACTOR THIS LATER
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
            title: "Courses",
            stylesheet: "courses.css",
            courses
        });
 
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
    }
});

router.post("/", async (req, res) => {
    try {
        const userId = await getUser(req);

        const courseName = req.body.course_name?.trim();
        const courseCode = req.body.course_code?.trim();
        const image = req.body.image?.trim() || null;

        if (!courseName || !courseCode) {
            return res.status(400).send(
                "Course name and code are required"
            );
        }

        const course = await db.one(
            `INSERT INTO courses
                (user_id, course_name, course_code, image)
             VALUES ($1, $2, $3, $4)
             RETURNING course_id;`,
            [userId, courseName, courseCode, image]
        );

        res.redirect(`/courses/${course.course_id}`);

    } catch (err) {
        console.error(err);
        res.status(500).send(`Failed to create course: ${err.message}`);
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
            title: selectedCourse.name,
            stylesheet: "courses.css",
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
