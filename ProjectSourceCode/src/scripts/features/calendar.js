
const express = require("express");
const router = express.Router();

const { db } = require("../db");
const { getCourses } = require("./courses");

/*
 * CALENDAR ROUTES
 *
 * This module handles:
 * - Displaying assignments on the monthly Calendar
 * - Returning assignment data as JSON
 * - Creating assignments
 * - Updating assignment completion status
 *
 * Attachment uploads and downloads are handled separately
 * by assignmentFiles.js.
 *
 * DEVELOPMENT NOTE:
 * The application currently uses user ID 1 for Calendar operations.
 * This must be replaced with the authenticated user's ID
 * before the application is deployed to production.
 */
const DEVELOPMENT_USER_ID = 1;


/*
 * Validate a year and month.
 *
 * The Calendar uses month numbers from 1 (January)
 * through 12 (December).
 */
function isValidMonth(year, month) {
    return (
        Number.isInteger(year) &&
        Number.isInteger(month) &&
        year >= 100 &&
        year <= 9999 &&
        month >= 1 &&
        month <= 12
    );
}


/*
 * Validate a date/time value from an HTML datetime-local input.
 *
 * Expected format:
 * YYYY-MM-DDTHH:mm
 *
 * This rejects invalid dates such as February 30
 * and invalid times such as 25:00.
 */
function isValidDueDate(value) {
    if (typeof value !== "string") {
        return false;
    }

    const match =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
        return false;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);

    if (
        !isValidMonth(year, month) ||
        day < 1 ||
        hour > 23 ||
        minute > 59
    ) {
        return false;
    }

    // Use UTC only for date validation, not for converting
    // the user's selected deadline to another timezone.
    const date = new Date(
        Date.UTC(year, month - 1, day, hour, minute)
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day &&
        date.getUTCHours() === hour &&
        date.getUTCMinutes() === minute
    );
}


/*
 * Retrieve assignments due during a selected month.
 *
 * The query joins assignments with courses so each
 * Calendar card can display the course information.
 *
 * Only assignments belonging to the specified user
 * are returned.
 */
async function getCalendarAssignments(userId, year, month) {

    // First day of the requested month.
    const startDate =
        `${year}-${String(month).padStart(2, "0")}-01`;

    let nextYear = year;
    let nextMonth = month + 1;

    // Move from December to January of the next year.
    if (nextMonth === 13) {
        nextMonth = 1;
        nextYear++;
    }

    // First day of the following month.
    // This is the exclusive upper boundary.
    const endDate =
        `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    /*
     * Filter assignments using:
     *
     * due_date >= first day of selected month
     * due_date <  first day of next month
     *
     * This includes every assignment in the selected month,
     * regardless of its due time.
     */
    return db.any(
        `
        SELECT
            a.assignment_id,
            a.assignment_name,
            a.description,
            a.priority,
            a.estimated_time,
            a.completed,

            TO_CHAR(
                a.due_date,
                'YYYY-MM-DD'
            ) AS due_day,

            TO_CHAR(
                a.due_date,
                'FMHH12:MI AM'
            ) AS due_time,

            c.course_name,
            c.course_code

        FROM assignments a

        JOIN courses c
            ON a.course_id = c.course_id

        WHERE c.user_id = $1
          AND a.due_date >= $2::date
          AND a.due_date < $3::date

        ORDER BY a.due_date;
        `,
        [userId, startDate, endDate]
    );
}


/*
 * GET /calendar
 *
 * Render the monthly Calendar page.
 *
 * An optional month parameter allows navigation:
 * /calendar?month=2026-11
 *
 * Without a month parameter, the current month is shown.
 */
router.get("/", async (req, res) => {
    try {
        const today = new Date();

        let year = today.getFullYear();
        let month = today.getMonth() + 1;

        // Read and validate the optional month parameter.
        if (req.query.month !== undefined) {

            if (typeof req.query.month !== "string") {
                return res.status(400).send(
                    "Invalid calendar month"
                );
            }

            const match =
                /^(\d{4})-(\d{2})$/.exec(req.query.month);

            if (!match) {
                return res.status(400).send(
                    "Invalid calendar month"
                );
            }

            year = Number(match[1]);
            month = Number(match[2]);
        }

        if (!isValidMonth(year, month)) {
            return res.status(400).send(
                "Invalid calendar month"
            );
        }

        // Use the current development user.
        const userId = DEVELOPMENT_USER_ID;

        // Retrieve assignments and courses for this user.
        const assignments =
            await getCalendarAssignments(userId, year, month);

        const courses = await getCourses(userId);

        /*
         * Organize assignments by their due date.
         *
         * Example:
         * {
         *   "2026-11-15": [assignment1, assignment2],
         *   "2026-11-18": [assignment3]
         * }
         */
        const assignmentsByDay = {};

        for (const assignment of assignments) {
            const dueDay = assignment.due_day;

            if (!assignmentsByDay[dueDay]) {
                assignmentsByDay[dueDay] = [];
            }

            assignmentsByDay[dueDay].push(assignment);
        }

        /*
         * Determine how the month fits into the
         * seven-column Calendar grid.
         */
        const firstDay =
            new Date(year, month - 1, 1).getDay();

        const daysInMonth =
            new Date(year, month, 0).getDate();

        const days = [];

        // Insert blank cells before the first day of the month.
        for (let i = 0; i < firstDay; i++) {
            days.push({
                isBlank: true
            });
        }

        /*
         * Build the Calendar days.
         *
         * Each day contains:
         * - Its day number
         * - Its full date
         * - All assignments due on that date
         */
        for (let day = 1; day <= daysInMonth; day++) {

            const dateString =
                `${year}-${String(month).padStart(2, "0")}` +
                `-${String(day).padStart(2, "0")}`;

            days.push({
                day: day,
                date: dateString,
                assignments: assignmentsByDay[dateString] || []
            });
        }

        // Calculate the previous month for navigation.
        let previousMonth = month - 1;
        let previousYear = year;

        if (previousMonth === 0) {
            previousMonth = 12;
            previousYear--;
        }

        // Calculate the next month for navigation.
        let nextMonth = month + 1;
        let nextYear = year;

        if (nextMonth === 13) {
            nextMonth = 1;
            nextYear++;
        }

        // Convert the month number into a readable month name.
        const monthName =
            new Date(year, month - 1, 1).toLocaleString(
                "default",
                { month: "long" }
            );

        /*
         * Render calendar.hbs.
         *
         * Handlebars uses this data to build the Calendar
         * and populate each assignment card.
         *
         * Completed assignments are styled in calendar.css
         * using their data-completed attribute.
         */
        return res.render("calendar", {
            title: "Calendar",
            stylesheet: "calendar.css",

            monthLabel: `${monthName} ${year}`,

            days: days,
            courses: courses,

            previousMonth:
                `${previousYear}-` +
                String(previousMonth).padStart(2, "0"),

            nextMonth:
                `${nextYear}-` +
                String(nextMonth).padStart(2, "0")
        });

    } catch (error) {
        console.error("Calendar error:", error);

        return res.status(500).send(
            "Unable to load calendar"
        );
    }
});


/*
 * GET /calendar/events
 *
 * Return assignments as JSON for a selected month.
 *
 * Example:
 * /calendar/events?year=2026&month=11
 *
 * This endpoint can be used by Calendar JavaScript
 * or other features needing assignment event data.
 */
router.get("/events", async (req, res) => {
    try {
        const today = new Date();

        const year =
            req.query.year === undefined
                ? today.getFullYear()
                : Number(req.query.year);

        const month =
            req.query.month === undefined
                ? today.getMonth() + 1
                : Number(req.query.month);

        // Reject invalid or out-of-range calendar dates.
        if (!isValidMonth(year, month)) {
            return res.status(400).json({
                error: "Invalid calendar year or month"
            });
        }

        const userId = DEVELOPMENT_USER_ID;

        const assignments =
            await getCalendarAssignments(userId, year, month);

        return res.status(200).json(assignments);

    } catch (error) {
        console.error("Calendar events error:", error);

        return res.status(500).json({
            error: "Unable to retrieve calendar events"
        });
    }
});


/*
 * POST /calendar/add
 *
 * Create a new assignment using the Calendar form.
 *
 * The frontend creates the assignment before uploading files,
 * because the S3 attachment route requires an assignment ID.
 *
 * Response behavior:
 * - JSON request: return the new ID and redirect URL
 * - Standard form: redirect to the assignment's month
 */
router.post("/add", async (req, res) => {
    try {
        const userId = DEVELOPMENT_USER_ID;

        // Read assignment information from the submitted form.
        const courseId = Number(req.body.course_id);

        const assignmentName =
            typeof req.body.assignment_name === "string"
                ? req.body.assignment_name.trim()
                : "";

        const description =
            typeof req.body.description === "string"
                ? req.body.description
                : null;

        const dueDate =
            typeof req.body.due_date === "string"
                ? req.body.due_date.trim()
                : "";

        const priority = req.body.priority || null;

        const estimatedTime =
            req.body.estimated_time === "" ||
            req.body.estimated_time == null
                ? null
                : Number(req.body.estimated_time);

        /*
         * Validate required assignment information.
         *
         * Assignment names must contain 1–150 characters.
         * A valid course and due date are also required.
         */
        if (
            !Number.isSafeInteger(courseId) ||
            courseId <= 0 ||
            !assignmentName ||
            assignmentName.length > 150 ||
            !isValidDueDate(dueDate)
        ) {
            return res.status(400).send(
                "Invalid assignment information"
            );
        }

        /*
         * Priority is optional, but only recognized values
         * are accepted.
         *
         * Estimated time is optional and must be a
         * nonnegative whole number of minutes when provided.
         */
        if (
            (
                priority !== null &&
                !["low", "medium", "high"].includes(priority)
            ) ||
            (
                estimatedTime !== null &&
                (
                    !Number.isSafeInteger(estimatedTime) ||
                    estimatedTime < 0
                )
            )
        ) {
            return res.status(400).send(
                "Invalid priority or estimated time"
            );
        }

        /*
         * Verify that the selected course belongs
         * to the current development user.
         *
         * This prevents assignments from being created
         * under another user's course.
         */
        const course = await db.oneOrNone(
            `
            SELECT course_id
            FROM courses
            WHERE course_id = $1
              AND user_id = $2;
            `,
            [courseId, userId]
        );

        if (!course) {
            return res.status(400).send(
                "Invalid course selected"
            );
        }

        /*
         * Save the assignment to PostgreSQL.
         *
         * RETURNING assignment_id supplies the ID needed
         * for uploading optional attachments to S3.
         */
        const createdAssignment = await db.one(
            `
            INSERT INTO assignments (
                course_id,
                assignment_name,
                description,
                due_date,
                priority,
                estimated_time
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING assignment_id;
            `,
            [
                courseId,
                assignmentName,
                description,
                dueDate,
                priority,
                estimatedTime
            ]
        );

        /*
         * Build a redirect to the month containing
         * the newly created assignment.
         */
        const month = dueDate.substring(0, 7);

        const redirectUrl =
            `/calendar?month=${encodeURIComponent(month)}`;

        /*
         * The updated calendar.hbs sends:
         * Accept: application/json
         *
         * Return the assignment ID so the frontend can
         * upload selected files using assignmentFiles.js.
         */
        if (
            (req.get("Accept") || "").includes(
                "application/json"
            )
        ) {
            return res.status(201).json({
                message: "Assignment created successfully.",
                assignmentId: createdAssignment.assignment_id,
                redirectUrl: redirectUrl
            });
        }

        // Support ordinary HTML form submissions as well.
        return res.redirect(303, redirectUrl);

    } catch (error) {
        console.error("Error adding assignment:", error);

        // PostgreSQL unique-constraint violation.
        if (error.code === "23505") {
            return res.status(409).send(
                "Assignment already exists"
            );
        }

        return res.status(500).send(
            "Unable to add assignment"
        );
    }
});


/*
 * POST /calendar/:assignmentId/completed
 *
 * Update an assignment's completion status.
 *
 * The frontend sends:
 * completed=true
 * or
 * completed=false
 *
 * PostgreSQL stores the updated Boolean value,
 * which is returned to the frontend as JSON.
 */
router.post("/:assignmentId/completed", async (req, res) => {
    try {
        const userId = DEVELOPMENT_USER_ID;

        // Retrieve the assignment ID and requested status.
        const assignmentId =
            Number(req.params.assignmentId);

        const completedValue =
            req.body.completed;

        // An assignment ID must be a positive integer.
        if (
            !Number.isSafeInteger(assignmentId) ||
            assignmentId <= 0
        ) {
            return res.status(400).json({
                error: "Invalid assignment ID"
            });
        }

        // Only explicit Boolean strings are accepted.
        if (
            completedValue !== "true" &&
            completedValue !== "false"
        ) {
            return res.status(400).json({
                error: "Invalid completion status"
            });
        }

        const completed = completedValue === "true";

        /*
         * Update only an assignment belonging to
         * the current development user.
         *
         * The course join checks assignment ownership
         * before applying the completion change.
         */
        const assignment = await db.oneOrNone(
            `
            UPDATE assignments a
            SET completed = $1
            FROM courses c
            WHERE a.course_id = c.course_id
              AND a.assignment_id = $2
              AND c.user_id = $3
            RETURNING
                a.assignment_id,
                a.completed;
            `,
            [completed, assignmentId, userId]
        );

        // Return 404 if the assignment does not exist for this user.
        if (!assignment) {
            return res.status(404).json({
                error: "Assignment not found"
            });
        }

        /*
         * Return the updated status to calendar.hbs.
         *
         * JavaScript updates the selected card's
         * data-completed attribute after receiving this response.
         *
         * The CSS then automatically changes the card's
         * appearance without requiring a page refresh.
         */
        return res.status(200).json(assignment);

    } catch (error) {
        console.error("Error updating assignment:", error);

        return res.status(500).json({
            error: "Unable to update assignment"
        });
    }
});


// Export the Calendar router for registration in app.js.
module.exports = router;
