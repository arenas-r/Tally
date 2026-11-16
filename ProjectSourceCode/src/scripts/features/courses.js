const express = require("express");
const router = express.Router();

const { db } = require("../db");

const {
    requireAuth,
    getCurrentUser
} = require("./auth"); 

router.use(requireAuth);

async function getUser(req) {
    return getCurrentUser(req).user_id;
}
 
async function getCourses(userId) {
    return await db.any(
        `SELECT *
         FROM courses
         WHERE user_id = ${userId};`,
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
 
async function getPendingAssignments(userId, courseId) {
    return await db.any(
        `SELECT
            a.*,
            (a.due_date < CURRENT_TIMESTAMP) AS overdue
         FROM assignments a
         JOIN courses c
             ON a.course_id = c.course_id
         WHERE c.user_id = $1
           AND c.course_id = $2
           AND a.completed = FALSE
         ORDER BY a.due_date ASC
         LIMIT 10;`,
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
        res.status(500).send(`Internal server error: ${err.message}`);
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
 
        const assignments = await getPendingAssignments(
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

    router.post("/:id/delete", async (req, res) => {
        try {
            const userId = await getUser(req);
            const courseId = req.params.id;

            const result = await db.result(
                `DELETE FROM courses
                WHERE course_id = $1
                AND user_id = $2;`,
                [courseId, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).send("Course not found");
            }

            res.redirect("/courses");

        } catch (err) {
            console.error("Failed to delete course:", err);
            res.status(500).send(`Failed to delete course: ${err.message}`);
        }
    });

    router.post("/:id/edit", async (req, res) => {
        try {
            const userId = await getUser(req);
            const courseId = req.params.id;

            const courseName = req.body.course_name?.trim();
            const courseCode = req.body.course_code?.trim();
            const image = req.body.image?.trim() || null;

            if (!courseName || !courseCode) {
                return res.status(400).send(
                    "Course name and code are required"
                );
            }

            if (courseName.length > 100 || courseCode.length > 10) {
                return res.status(400).send(
                    "Course name or code is too long"
                );
            }

            const course = await db.oneOrNone(
                `UPDATE courses
                SET course_name = $1,
                    course_code = $2,
                    image = $3
                WHERE course_id = $4
                AND user_id = $5
                RETURNING course_id;`,
                [courseName, courseCode, image, courseId, userId]
            );

            if (!course) {
                return res.status(404).send("Course not found");
            }

            res.redirect(303, `/courses/${course.course_id}`);

        } catch (err) {
            console.error("Failed to edit course:", err);
            res.status(500).send("Failed to edit course");
        }
    });
});
 
module.exports = {
    router,
    getCourses,
    getPendingAssignments
};
